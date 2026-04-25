# DocPanther

Multi-tenant document collection SaaS. Businesses create checklists, share a link, and customers upload documents against each checklist item — no account required for customers.

## Architecture Overview

```
docpanther/
├── backend/          Java 17 + Spring Boot 3 monolith
├── web/              Next.js 14 frontend (App Router + TypeScript)
├── contracts/        OpenAPI spec + data models (single source of truth)
├── infra/            Terraform (AWS skeleton)
├── docker/           Init SQL for local Postgres
└── docker-compose.yml   Full stack: Postgres + Redis + MinIO + backend + frontend
```

**Backend modules** (each in its own package, one agent per module):
`auth` · `tenant` · `cases` · `checklist` · `storage` · `sharing` · `filesystem` · `notifications` · `audit` · `superadmin` · `education`

---

## Local Development (no Docker)

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java | 17 | `java -version` |
| Maven | 3.9+ | `mvn -version` |
| PostgreSQL | 15 | Running on port 5432 |
| Redis | 7 | Running on port 6379 |
| Node.js | 18+ | `node -version` |

### 1. Database setup

```bash
psql -U postgres -c "CREATE USER docpanther WITH PASSWORD 'localdev123';"
psql -U postgres -c "CREATE DATABASE docpanther OWNER docpanther;"
```

Flyway runs migrations automatically on startup — no manual schema setup needed.

### 2. Start the backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Backend starts at **http://localhost:8080**

The `local` profile sets:
- DB: `postgresql://localhost:5432/docpanther` (user: `docpanther`, password: `localdev123`)
- Redis: `localhost:6379`
- File storage: **local disk mode** (no AWS/MinIO needed — see below)
- Email: prints to stdout/log instead of sending (see below)

### 3. Start the frontend

```bash
cd web
npm install

# Create local env file (required — sets the backend URL)
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

npm run dev
```

Frontend starts at **http://localhost:3000**

---

## Key URLs

| URL | What it is |
|-----|-----------|
| `http://localhost:3000` | Main app (login, dashboard, cases) |
| `http://localhost:3000/admin` | SuperAdmin portal (SUPER_ADMIN role required) |
| `http://localhost:3000/upload/{token}` | Public upload portal (no login needed) |
| `http://localhost:3000/shared/{token}` | Public shared document viewer |
| `http://localhost:8080/swagger-ui.html` | API docs (if Swagger enabled) |

---

## Local File Storage (no S3 needed)

When running with the `local` profile, file uploads don't need AWS or MinIO.

**How it works:**
1. Backend generates a presigned URL pointing to itself: `http://localhost:8080/_local-storage/put/{key}?token=...`
2. The browser PUTs the file directly to that URL
3. Backend saves the file to `$TMPDIR/docpanther-uploads/`
4. A GET endpoint serves files back: `http://localhost:8080/_local-storage/get/{key}`

Files are stored at `/tmp/docpanther-uploads/` (or your OS temp dir). They persist as long as the temp directory isn't cleared.

**Switching to real S3 / MinIO:** Remove `app.s3.local-mode: true` from `application.yml` and set:
```
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, APP_S3_BUCKET, AWS_REGION
```

---

## Email Verification (local dev)

All emails (registration verification, password reset, invites) are printed to the backend logs — nothing is actually sent.

**Find verification / password reset links:**

```bash
# If you redirected backend output to a log file:
grep -i "verify\|reset\|token" /tmp/backend.log

# Or check the terminal where the backend is running — look for lines like:
# [MAIL] To: user@example.com
# [MAIL] Subject: Verify your email
# [MAIL] Body: Click here: http://localhost:3000/verify-email?token=abc123
```

Alternatively, query the database directly:

```bash
# Get email verification token for a user
psql -U docpanther -d docpanther \
  -c "SELECT token FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email = 'you@example.com') ORDER BY created_at DESC LIMIT 1;"

# Get password reset token
psql -U docpanther -d docpanther \
  -c "SELECT token FROM password_reset_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'you@example.com') ORDER BY created_at DESC LIMIT 1;"
```

Then open `http://localhost:3000/verify-email?token=<token>` in your browser.

---

## Promoting a User to SuperAdmin

```bash
psql -U docpanther -d docpanther \
  -c "UPDATE user_tenant_roles SET role = 'SUPER_ADMIN' WHERE user_id = (SELECT id FROM users WHERE email = 'you@example.com');"
```

**Important:** You must log out and log back in after the DB update — the role is embedded in the JWT at login time and cached until re-login.

Then visit `http://localhost:3000/admin`.

---

## Testing Flows

### Registration + Email Verification
1. Go to `http://localhost:3000/register`
2. Fill in org name, email, password
3. Check backend logs for the verification link
4. Open the link → redirects to dashboard

### Case + Upload Portal
1. Log in → Dashboard → Cases → Create a case
2. Add checklist items to the case
3. Open the case → click "Share" → copy the upload link
4. Open the upload link in an incognito window (`/upload/{token}`)
5. Upload a file against a checklist item
6. Back in the app, the file appears on the case

### Password Reset
1. Go to `http://localhost:3000/forgot-password`
2. Enter email → submit
3. Check backend logs for the reset link
4. Open the link → set new password

### SuperAdmin Portal
1. Promote your user to SUPER_ADMIN (see above)
2. Log out → log back in
3. Go to `http://localhost:3000/admin`
4. Available pages: Platform Stats, Tenants, Pods, User Lookup

### Shared Document Viewer
1. Open a case with uploaded documents
2. Click "Share" → create a shareable link
3. Open `http://localhost:3000/shared/{token}` in an incognito window

---

## Full Stack with Docker Compose

Runs everything (Postgres, Redis, MinIO, backend, frontend) in containers:

```bash
docker compose up --build
```

Services:
- Postgres on `5432`
- Redis on `6379`
- MinIO on `9000` (API) + `9001` (console at `http://localhost:9001`, login: `minioadmin/minioadmin`)
- Backend on `8080`
- Frontend on `3000`

> **Note:** When running via Docker Compose, file storage uses MinIO (not the local disk mode). The `minio-init` service creates the bucket and sets CORS automatically.

---

## Pod Architecture

The multi-tenant pod routing architecture is **stubbed but not wired**:
- `PodDataSourceRouter`, `PodRoutingService`, `TenantContextHolder` exist in `common/`
- Currently all tenants share one database (`docpanther` on localhost)
- Pod routing will be activated when multiple pod databases are provisioned

---

## Backend Commands

```bash
cd backend

# Run (local profile)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Run tests
mvn test

# Compile check only
mvn compile

# Build JAR
mvn package -DskipTests
```

## Frontend Commands

```bash
cd web

npm run dev      # development server (hot reload)
npm run build    # production build
npm run lint     # ESLint
```

---

## Environment Variables

### Backend (set via env or `application-local.yml`)

| Variable | Default (local) | Description |
|----------|----------------|-------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/docpanther` | Database URL |
| `DB_USERNAME` | `docpanther` | DB user |
| `DB_PASSWORD` | `docpanther` | DB password |
| `REDIS_HOST` | `localhost` | Redis host |
| `JWT_SECRET` | `local-dev-jwt-secret-must-be-32chars!` | JWT signing secret (change in prod) |
| `AWS_ACCESS_KEY_ID` | — | S3 / MinIO access key (not needed in local-mode) |
| `AWS_SECRET_ACCESS_KEY` | — | S3 / MinIO secret key |
| `APP_S3_BUCKET` | — | S3 bucket name |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8080`) — **required** |
