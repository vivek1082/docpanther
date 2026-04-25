# Deploying DocPanther on Hostinger VPS

## What you need

| Requirement | Notes |
|-------------|-------|
| Hostinger KVM VPS | 4 GB RAM minimum (2 GB is too tight for Spring Boot + Next.js) |
| Ubuntu 22.04 | Recommended OS |
| A domain name | Point A record to your VPS IP |
| AWS S3 bucket | For file storage in production |
| AWS SES | For sending emails in production |

---

## 1. Point your domain

In your DNS provider (or Hostinger DNS manager), add an A record:

```
Type: A
Name: @          (or your subdomain)
Value: <your VPS IP>
TTL:  300
```

Also add `www`:
```
Type: A
Name: www
Value: <your VPS IP>
```

---

## 2. SSH into your VPS and install Docker

```bash
ssh root@YOUR_VPS_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose v2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify
docker compose version
```

---

## 3. Install Certbot (SSL)

```bash
apt install -y certbot

# Stop anything on port 80 first, then get certificate
certbot certonly --standalone -d YOUR_DOMAIN -d www.YOUR_DOMAIN \
  --non-interactive --agree-tos -m your@email.com
```

Certificates are saved to `/etc/letsencrypt/live/YOUR_DOMAIN/`.

---

## 4. Upload your code to the VPS

From your local machine:

```bash
# Option A — rsync (fastest)
rsync -avz --exclude node_modules --exclude target --exclude .git \
  /Users/vivekkumar/Documents/vivi-doc-collector/ \
  root@YOUR_VPS_IP:/opt/docpanther/

# Option B — git clone (if repo is on GitHub)
ssh root@YOUR_VPS_IP "git clone https://github.com/YOUR/REPO /opt/docpanther"
```

---

## 5. Create the environment file

On the VPS:

```bash
cd /opt/docpanther
cp .env.hostinger.example .env   # if the file exists, or create it:
nano .env
```

Paste and fill in:

```bash
# Postgres
POSTGRES_PASSWORD=choose-a-strong-password

# JWT — generate with: openssl rand -hex 32
APP_JWT_SECRET=your-32-char-random-secret

# Domain
DOMAIN=yourdomain.com

# AWS S3 (production file storage)
APP_S3_BUCKET=docpanther-prod
APP_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AWS SES — same credentials as above, or separate IAM key
# SES region must be where you've verified your sender domain
```

---

## 6. Update nginx.conf with your domain

```bash
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' /opt/docpanther/docker/nginx.conf
```

---

## 7. Deploy

```bash
cd /opt/docpanther

docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build
```

First build takes 5–10 minutes (Maven downloads dependencies, npm installs packages).

Watch logs:
```bash
docker compose -f docker-compose.hostinger.yml logs -f backend
docker compose -f docker-compose.hostinger.yml logs -f web
```

---

## 8. Verify

```bash
# All containers running?
docker compose -f docker-compose.hostinger.yml ps

# Backend healthy?
curl http://localhost:8080/actuator/health

# Site accessible?
curl -I https://yourdomain.com
```

---

## 9. Auto-renew SSL

Certbot certificates expire every 90 days. Add a cron job:

```bash
crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && docker compose -f /opt/docpanther/docker-compose.hostinger.yml restart nginx
```

---

## Updating the app

```bash
cd /opt/docpanther

# Pull latest code
git pull   # or rsync again

# Rebuild and restart
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build
```

Flyway migrations run automatically on backend startup.

---

## Production S3 Setup

In production the app uses real AWS S3 (not the local disk mode). You need:

1. **Create an S3 bucket** in `ap-south-1` (or your chosen region), named e.g. `docpanther-prod`
2. **CORS configuration** on the bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
3. **IAM user** with policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::docpanther-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::docpanther-prod"
    }
  ]
}
```

---

## Production Email (AWS SES)

1. Verify your sending domain in SES
2. Request production access (removes sandbox restriction)
3. The backend reads `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — same IAM user or a separate one with SES permissions:
```json
{
  "Effect": "Allow",
  "Action": "ses:SendEmail",
  "Resource": "*"
}
```

---

## Pod Architecture on Hostinger

Currently DocPanther runs in **single-pod mode** — all tenants share one Postgres instance on the VPS. This is the right setup for early-stage.

When you want to add a second pod (e.g. for EU tenants on a separate VPS):
1. Provision a new Postgres instance (another Hostinger VPS, or RDS)
2. Run the Flyway migrations on it: `mvn flyway:migrate -Dspring.datasource.url=jdbc:postgresql://...`
3. Log in to the SuperAdmin portal → Pods → Provision Pod
   - Fill in region, type, and **the DB URL + credentials** for the new DB
4. The pod is registered immediately — no restart needed
5. New tenants in that region are automatically assigned to the least-loaded active pod

---

## Resource Requirements

| Service | RAM Usage |
|---------|-----------|
| Spring Boot backend | ~256–400 MB |
| Next.js | ~128–200 MB |
| PostgreSQL | ~64–128 MB |
| Redis | ~10 MB |
| Nginx | ~5 MB |
| **Total** | **~500–750 MB** |

**Recommended:** KVM 2 (2 vCPU, 4 GB RAM) — gives room to grow.

---

## Troubleshooting

**Backend won't start:**
```bash
docker compose -f docker-compose.hostinger.yml logs backend | grep -i "error\|exception" | tail -30
```

**Flyway migration failed:**
```bash
# Connect to postgres and check
docker exec -it $(docker compose -f docker-compose.hostinger.yml ps -q postgres) \
  psql -U docpanther -d docpanther -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

**SSL not working:**
```bash
# Check cert exists
ls /etc/letsencrypt/live/yourdomain.com/

# Reload nginx
docker compose -f docker-compose.hostinger.yml restart nginx
```

**Out of disk:**
```bash
# Clean unused Docker layers
docker system prune -f
```
