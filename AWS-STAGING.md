# DocPanther — AWS Staging Deployment

Everything runs on a single EC2 instance using Docker Compose. You get AWS's IAM, S3, and SES without the complexity or cost of Fargate/ECS (which is covered in `TERRAFORM.md` for production).

**Total cost: ~$29–32/month** · EC2 t3.medium ~$26 · EBS 30GB ~$2.50 · S3/SES ~$1

---

## Before You Start — Checklist

Have these ready before step 1:

- [ ] AWS account created
- [ ] Domain name (e.g. `staging.docpanther.com`) — from any registrar
- [ ] Your local machine has `rsync` installed (comes with macOS)
- [ ] About 45 minutes free

---

## Part 1 — AWS Account & IAM

### 1.1 Create AWS account

1. Go to **aws.amazon.com** → **Create an AWS Account**
2. Fill in email, password, account name (e.g. `DocPanther`)
3. Account type: **Personal**
4. Enter credit card — won't charge unless you exceed free tier
5. Phone verification → choose **Basic support (Free)**
6. Sign into the **AWS Management Console**

### 1.2 Set your region

Top-right corner of the Console → click the region dropdown → select **Asia Pacific (Mumbai) — ap-south-1**.

Every step in this guide assumes `ap-south-1`. Don't switch regions accidentally.

### 1.3 Create an IAM admin user (never use root)

The root account shouldn't be used for day-to-day work — one compromised credential and everything is gone.

1. Search bar → **IAM** → **Users** → **Create user**
2. Username: `vivek-admin`
3. Check **"Provide user access to the AWS Management Console"**
4. Select **"I want to create an IAM user"**
5. Password: set one, uncheck "require password reset on next sign-in"
6. Next → **Attach policies directly** → search and check **AdministratorAccess**
7. Create user → **Download the CSV** (has your console login URL + credentials)
8. Sign out of root → sign back in using the URL from the CSV

From now on, always log in as `vivek-admin`, never as root.

---

## Part 2 — EC2 Instance

### 2.1 Launch the instance

Console → search **EC2** → **Launch instance** (orange button)

| Field | Value |
|-------|-------|
| Name | `docpanther-staging` |
| AMI | Ubuntu Server 22.04 LTS |
| Architecture | 64-bit (x86) |
| Instance type | **t3.medium** (2 vCPU, 4 GB RAM) |
| Key pair | **Create new key pair** → name: `docpanther-key` → RSA → .pem → **Download** |

> Save `docpanther-key.pem` in a safe place — AWS won't let you download it again.

**Network settings** → click **Edit**:
- Auto-assign public IP: **Enable**
- Firewall → **Create security group**, name: `docpanther-sg`
- Add inbound rules:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | **My IP** (auto-detected) |
| HTTP | 80 | Anywhere (0.0.0.0/0) |
| HTTPS | 443 | Anywhere (0.0.0.0/0) |

**Configure storage:** change from 8 GB to **30 GB gp3**

Click **Launch instance** → **View all instances** — wait until status shows **Running**.

### 2.2 Allocate an Elastic IP (fixed IP address)

By default EC2 gets a new IP every time it restarts. An Elastic IP makes it permanent.

1. Left sidebar → **Elastic IPs** → **Allocate Elastic IP address** → **Allocate**
2. Select the new IP → **Actions** → **Associate Elastic IP address**
3. Instance → select `docpanther-staging` → **Associate**

Note down your Elastic IP — you'll use it in DNS and SSH commands.

### 2.3 Set up SSH shortcut

Do this once on your **local machine** so you don't type the long SSH command every time:

```bash
# Move key to the standard location
mkdir -p ~/.ssh
mv ~/Downloads/docpanther-key.pem ~/.ssh/docpanther-key.pem
chmod 400 ~/.ssh/docpanther-key.pem

# Add a shortcut to SSH config
cat >> ~/.ssh/config << EOF

Host docpanther-staging
  HostName YOUR_ELASTIC_IP
  User ubuntu
  IdentityFile ~/.ssh/docpanther-key.pem
EOF
```

Replace `YOUR_ELASTIC_IP` with your actual IP. Now you can SSH in with just:

```bash
ssh docpanther-staging
```

---

## Part 3 — Server Setup

SSH into the EC2 and run everything below on the server:

```bash
ssh docpanther-staging
```

### 3.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker       # apply group change without logging out
docker --version    # verify
```

### 3.3 Install Docker Compose v2

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version   # verify
```

### 3.4 Install Certbot

```bash
sudo apt install -y certbot
```

---

## Part 4 — S3 Bucket

### 4.1 Create the bucket

1. Console → **S3** → **Create bucket**
2. Bucket name: `docpanther-staging` (globally unique — if taken, use `docpanther-staging-vk`)
3. Region: **ap-south-1**
4. **Uncheck** "Block all public access" (presigned uploads need this off)
5. Check the acknowledgement box
6. **Create bucket**

### 4.2 Set CORS

Bucket → **Permissions** tab → scroll to **Cross-origin resource sharing (CORS)** → **Edit** → paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://staging.yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace `staging.yourdomain.com` with your actual domain. Save.

---

## Part 5 — IAM User for the App

The app needs its own AWS credentials — never reuse your admin credentials in application code.

### 5.1 Create the IAM policy

**IAM** → **Policies** → **Create policy** → **JSON** tab → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:GetObjectAttributes"],
      "Resource": "arn:aws:s3:::docpanther-staging/*"
    },
    {
      "Sid": "S3List",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::docpanther-staging"
    },
    {
      "Sid": "SESAccess",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

Next → Name: `docpanther-app-policy` → **Create policy**

### 5.2 Create the IAM user

1. **IAM** → **Users** → **Create user**
2. Name: `docpanther-app` — do NOT enable console access
3. Next → **Attach policies directly** → search and check `docpanther-app-policy`
4. Create user → click on the user → **Security credentials** → **Create access key**
5. Use case: **Application running outside AWS** → Next → **Download CSV**

The CSV contains `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Keep it safe.

---

## Part 6 — SES (Email)

### 6.1 Verify your sending email

1. Console → search **Simple Email Service** → make sure region is **ap-south-1**
2. Left sidebar → **Verified identities** → **Create identity**
3. Identity type: **Email address**
4. Enter the address you want to send from: `noreply@yourdomain.com`
5. **Create identity** → AWS sends a verification email → click the link
6. Status changes to **Verified**

> **SES Sandbox:** New accounts can only send to verified addresses. This is fine for staging.
> To send to anyone (e.g. real customers), go to SES → **Account dashboard** → **Request production access** — takes 1–2 business days.

**Option B — Verify full domain** (better for real staging): Create identity → Domain → enter your domain → AWS gives you DNS records (DKIM CNAMEs + TXT). Add them in your DNS provider. Takes 15–30 min to propagate.

---

## Part 7 — DNS + SSL

### 7.1 Point your domain to EC2

In your domain registrar's DNS settings, add:

```
Type: A
Name: staging           →  creates staging.yourdomain.com
Value: YOUR_ELASTIC_IP
TTL: 300
```

Check propagation (wait a few minutes first):
```bash
dig staging.yourdomain.com +short
# Should return your Elastic IP
```

### 7.2 Get SSL certificate

On the EC2:

```bash
sudo certbot certonly --standalone \
  -d staging.yourdomain.com \
  --non-interactive --agree-tos \
  -m your@email.com
```

Success output: `Certificate is saved at: /etc/letsencrypt/live/staging.yourdomain.com/`

---

## Part 8 — Deploy

### 8.1 Generate secrets (run on EC2)

```bash
echo "POSTGRES_PASSWORD:";  openssl rand -base64 24
echo "APP_JWT_SECRET:";      openssl rand -hex 32
```

Copy both outputs — you'll paste them into the .env file next.

### 8.2 Upload code from local machine

On your **local machine**:

```bash
rsync -avz \
  --exclude node_modules \
  --exclude target \
  --exclude .git \
  --exclude '*.class' \
  --exclude logs \
  /Users/vivekkumar/Documents/vivi-doc-collector/ \
  docpanther-staging:/opt/docpanther/
```

Takes 1–2 minutes.

### 8.3 Update nginx.conf with your domain

On the EC2:

```bash
sed -i 's/YOUR_DOMAIN/staging.yourdomain.com/g' /opt/docpanther/docker/nginx.conf
```

### 8.4 Create the environment file

```bash
nano /opt/docpanther/.env
```

Fill in all values (use the secrets you generated in 8.1):

```bash
# ── Database ─────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=paste-from-step-8.1

# ── Domain ───────────────────────────────────────────────────────────────────
DOMAIN=staging.yourdomain.com

# ── JWT ──────────────────────────────────────────────────────────────────────
APP_JWT_SECRET=paste-from-step-8.1

# ── AWS S3 ───────────────────────────────────────────────────────────────────
APP_S3_BUCKET=docpanther-staging
APP_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=paste-from-iam-csv
AWS_SECRET_ACCESS_KEY=paste-from-iam-csv

# ── Email (SES) ───────────────────────────────────────────────────────────────
MAIL_FROM=noreply@yourdomain.com

# ── Google OAuth (optional — leave blank to skip) ─────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

### 8.5 Deploy

```bash
cd /opt/docpanther

docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build
```

**First build takes 8–12 minutes.** Maven downloads all Java dependencies, npm installs packages — this is normal.

Watch progress:
```bash
docker compose -f docker-compose.hostinger.yml logs -f backend
```

You'll see Flyway running migrations (V1 through V15), then:
```
Started DocPantherApplication in XX.XXX seconds
```

---

## Part 9 — Verify

```bash
# All 4 containers should show "Up"
docker compose -f docker-compose.hostinger.yml ps

# Backend health check
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}

# HTTPS from outside
curl -I https://staging.yourdomain.com
# Expected: HTTP/2 200
```

Open **https://staging.yourdomain.com** in your browser — you should see the login page.

---

## Part 10 — First-Time Setup

### Register your account

1. Go to `https://staging.yourdomain.com/register`
2. Choose **Enterprise** — fill in org name, email, password
3. Check backend logs for the verification email link:
   ```bash
   docker compose -f docker-compose.hostinger.yml logs backend | grep -i "verify"
   ```
4. Open the verification link

### Promote to SuperAdmin

```bash
# Connect to Postgres
docker exec -it \
  $(docker compose -f /opt/docpanther/docker-compose.hostinger.yml ps -q postgres) \
  psql -U docpanther -d docpanther
```

Inside psql:
```sql
UPDATE user_tenant_roles
   SET role = 'SUPER_ADMIN'
 WHERE user_id = (SELECT id FROM users WHERE email = 'your@email.com');
\q
```

Log out of the app → log back in → go to `https://staging.yourdomain.com/admin`

### What happens when you register a new org

With the pod architecture now active:
- A new tenant is created and automatically assigned to the **default pod** (the local Postgres)
- The assignment is cached in Redis (`pod:tenant:{id}` key)
- All subsequent requests for that tenant route through the pod DataSource
- In the SuperAdmin → Pods page you'll see `tenant_count` increment

---

## Part 11 — Keeping It Running

### Auto-renew SSL (run once)

```bash
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet && docker compose -f /opt/docpanther/docker-compose.hostinger.yml restart nginx
```

### Save cost when not using staging

Stop the EC2 when you don't need it — you only pay for EBS storage (~$2.50/mo) when stopped, not compute.

**Stop:** EC2 Console → select instance → **Instance state** → **Stop instance**  
**Start again:** same menu → **Start instance**

The Elastic IP stays attached, so your domain still resolves correctly once the instance starts.

> Note: Docker containers do NOT auto-start after the instance starts. Run:
> ```bash
> ssh docpanther-staging
> cd /opt/docpanther
> docker compose -f docker-compose.hostinger.yml --env-file .env up -d
> ```

### Update after code changes

```bash
# Push updated code from local machine
rsync -avz \
  --exclude node_modules --exclude target --exclude .git \
  /Users/vivekkumar/Documents/vivi-doc-collector/ \
  docpanther-staging:/opt/docpanther/

# Rebuild and restart on EC2
ssh docpanther-staging "cd /opt/docpanther && docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build"
```

Flyway runs any new migrations automatically. No manual DB steps needed.

---

## Part 12 — Monitoring

### View live logs

```bash
# All services
docker compose -f docker-compose.hostinger.yml logs -f

# Errors only
docker compose -f docker-compose.hostinger.yml logs backend | grep -iE "error|exception|warn"

# Last 100 lines
docker compose -f docker-compose.hostinger.yml logs --tail=100 backend
```

### Enable CloudWatch (optional — lets you see logs in AWS Console)

On the EC2:

```bash
# Download and install agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Create config
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/**/*-json.log",
            "log_group_name": "/docpanther/staging/docker",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF

# Start agent
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent
```

Then attach the `CloudWatchAgentServerPolicy` IAM policy to the EC2 instance:
1. EC2 Console → select instance → **Actions** → **Security** → **Modify IAM role**
2. If no role: IAM → **Roles** → **Create role** → AWS service → EC2 → attach `CloudWatchAgentServerPolicy` → create role
3. Select the new role → **Update IAM role**

Logs appear in **CloudWatch** → **Log groups** → `/docpanther/staging/docker`

---

## Troubleshooting

**Backend won't start:**
```bash
docker compose -f docker-compose.hostinger.yml logs backend | tail -60
```
Common causes:
- `POSTGRES_PASSWORD` mismatch — must be identical in `.env` and what was used to create the DB (delete the postgres volume and retry if needed: `docker compose -f docker-compose.hostinger.yml down -v`)
- Flyway migration failed — look for `FlywayException`. Usually means a SQL error in a migration file.
- Out of memory — check `free -h`. If less than 500MB free, upgrade to t3.large.

**Site not reachable (nginx):**
```bash
# Is nginx running?
docker compose -f docker-compose.hostinger.yml ps nginx

# Is the nginx config valid?
docker exec $(docker compose -f docker-compose.hostinger.yml ps -q nginx) nginx -t

# Are the SSL certs in the right place?
ls /etc/letsencrypt/live/staging.yourdomain.com/

# Did certbot succeed? Check:
sudo certbot certificates
```

**Files not uploading (S3):**
```bash
# Confirm env vars reached the container
docker exec $(docker compose -f docker-compose.hostinger.yml ps -q backend) env | grep -E "AWS|S3"

# Check for S3 errors in backend logs
docker compose -f docker-compose.hostinger.yml logs backend | grep -iE "s3|presign|access denied"
```
Most common causes: wrong bucket name, wrong region, IAM policy missing `s3:PutObject`.

**Emails not sending:**
- Confirm `MAIL_FROM` exactly matches your verified SES identity (case-sensitive)
- Check SES sandbox: in sandbox mode you can only send to verified addresses
- Backend log: `grep -i "ses\|mail\|send" logs`

**Disk full:**
```bash
df -h
docker system prune -f   # removes stopped containers, dangling images
```

---

## Environment Variables — Quick Reference

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` | Yes |
| `DOMAIN` | Your domain, e.g. `staging.docpanther.com` | Yes |
| `APP_JWT_SECRET` | `openssl rand -hex 32` | Yes |
| `APP_S3_BUCKET` | Name you gave the S3 bucket | Yes |
| `APP_S3_REGION` | `ap-south-1` | Yes |
| `AWS_ACCESS_KEY_ID` | IAM user CSV | Yes |
| `AWS_SECRET_ACCESS_KEY` | IAM user CSV | Yes |
| `MAIL_FROM` | Verified SES email address | Yes |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | No |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | No |

---

## Cost Breakdown

| Service | Spec | Cost/month |
|---------|------|-----------|
| EC2 t3.medium | 2 vCPU, 4 GB | ~$26 |
| EBS 30 GB gp3 | Disk | ~$2.50 |
| Elastic IP | Fixed when attached to running instance | $0 |
| S3 | ~5 GB storage + requests | ~$0.20 |
| SES | ~1000 emails | ~$0.10 |
| Data transfer | ~5 GB out | ~$0.60 |
| **Total** | | **~$29–32/month** |

**When stopped:** ~$2.50/month (EBS only)

> When you're ready for production-grade infrastructure (ECS Fargate, Aurora, CloudFront, WAF), see `TERRAFORM.md`.
