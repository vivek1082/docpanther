# DocPanther — Full Product Plan

## Big Picture

```
docpanther.com              → marketing + demo (already built, demo-website/)
app.docpanther.com          → product frontend (web/ — Next.js)
api.docpanther.com          → Java Spring Boot backend (backend/)
{tenant}.docpanther.com     → tenant-branded customer upload portal
```

---

## User Modes

### Individual User
- **Primary:** Sign-up form — name, email, password
- **Secondary:** "Sign in with Google" (OAuth) as an alternative
- Email verification required for form-based signup
- Password reset via email link
- No subdomain — uses `app.docpanther.com` directly
- All data stored in India (ap-south-1) by default

### Tenant / Enterprise
- **Always form-based registration** — no OAuth shortcut for org creation
- Registration form fields: org name, org slug (subdomain), admin name, work email, password, billing address, country, **AWS region selection**
- Email verification required before org is activated
- Slug becomes subdomain: `hdfc.docpanther.com`
- Admin invites team members via email
- Region choices: India (Mumbai), US (N. Virginia), Europe (Frankfurt), Middle East (UAE)
- Once region is set → ALL tenant data (DB + S3) stays in that region → GDPR/DPDP compliant
- Future: SAML/SSO for enterprise

### Roles
```
SUPER_ADMIN     → DocPanther internal ops
TENANT_ADMIN    → Manages org, billing, team
TENANT_MEMBER   → Creates/manages cases
INDIVIDUAL      → Personal plan user
```

---

## Module 1 — Auth & Registration

**Two auth methods supported:**

**Form-based (primary for both modes):**
- Register: name + email + password → email verification link sent via SES
- Click verify link → account activated → issue JWT
- Login: email + password → issue JWT
- Password reset: POST email → SES link → POST new password

**Google OAuth (secondary — individual users only):**
- "Sign in with Google" button → OAuth flow → create/find user → issue JWT
- NOT available for enterprise registration (always form-based)

**Session:**
- JWT: access token (15 min) + refresh token (7 days, stored in Redis)
- Frontend silently refreshes access token on expiry
- Logout: revoke refresh token from Redis

**Endpoints:**
```
POST /api/auth/register             → form signup (individual or enterprise)
POST /api/auth/verify-email         → verify email token
POST /api/auth/login                → email + password login
POST /api/auth/forgot-password      → send password reset email
POST /api/auth/reset-password       → set new password via reset token
POST /api/auth/refresh              → issue new access + refresh token pair
POST /api/auth/logout               → revoke refresh token
GET  /api/auth/me                   → current user profile

GET  /api/auth/google               → redirect to Google consent (individual only)
GET  /api/auth/google/callback      → handle callback, issue JWT, redirect to frontend
```

---

## Module 2 — Tenant Management

- Create org (name, slug, region) → stored in control plane DB
- Slug becomes subdomain: `{slug}.docpanther.com`
- Invite member by email → SES email with accept link → member joins with TENANT_MEMBER role
- Admin can change member role or remove member

**Endpoints:**
```
POST   /api/tenants                         → create tenant (caller becomes TENANT_ADMIN)
GET    /api/tenants/me                      → current tenant info
PUT    /api/tenants/me                      → update name, logo
POST   /api/tenants/me/members              → invite member by email
PUT    /api/tenants/me/members/{userId}     → change role
DELETE /api/tenants/me/members/{userId}     → remove member
```

---

## Module 3 — Case Management

A **Case** = one document collection request for one customer.

**Case fields:**
- `reference_no` — internal ref (e.g. LOAN-2024-001)
- `customer_name`, `customer_email`
- `tags[]` — for filtering/grouping
- `status` — PENDING / PARTIAL / COMPLETE (derived from checklist item statuses)
- `storage_mode` — FLAT or STRUCTURED (affects ZIP download structure, not S3 path)
- `upload_token` — UUID, unique, unguessable — powers the customer upload URL
- `expires_at` — optional link expiry

**Customer Upload URL:** `{tenant}.docpanther.com/upload/{token}` — no auth required

**Endpoints:**
```
GET    /api/cases               → list cases (paginated, filter by status/tags)
POST   /api/cases               → create case
GET    /api/cases/{id}          → case detail + checklist items
PUT    /api/cases/{id}          → update case metadata
DELETE /api/cases/{id}          → delete case
POST   /api/cases/{id}/remind   → send reminder email to customer
GET    /api/cases/{id}/download → stream ZIP of all documents
GET    /api/cases/{id}/audit    → paginated audit log for case
```

---

## Module 4 — Checklist & Templates

### Checklist Item Types
- `FILE_UPLOAD` → customer uploads a file → stored in S3
- `TEXT_INPUT` → customer fills a text field → stored in DB (included as .txt in ZIP)

### Item Status Flow
```
PENDING → UPLOADED → APPROVED
                  ↘ REJECTED → PENDING  (customer re-uploads)
```

### Templates
- Reusable lists of checklist items (name, type, required, description, order)
- Global templates (DocPanther defaults) + tenant-specific templates
- Creating a case: pick a template → items are **copied** into the case (independent snapshot)

**Endpoints:**
```
GET    /api/cases/{id}/items                    → list checklist items
POST   /api/cases/{id}/items                    → add item to case
PUT    /api/cases/{id}/items/{itemId}           → approve / reject / edit item
DELETE /api/cases/{id}/items/{itemId}           → remove item

GET    /api/templates                           → list templates
POST   /api/templates                           → create template
GET    /api/templates/{id}                      → template detail
PUT    /api/templates/{id}                      → update template
DELETE /api/templates/{id}                      → delete template
POST   /api/templates/{id}/apply/{caseId}       → copy template items into a case
```

---

## Module 5 — File Storage (S3 + Presigned URLs)

Backend never handles file bytes. Client uploads directly to S3.

**Upload flow:**
```
1. Admin/Customer → POST .../upload-url
2. Backend        → generate S3 presigned PUT URL (15 min expiry) → return to client
3. Client         → PUT file directly to S3 using presigned URL
4. Client         → POST .../confirm-upload  { filename, size, s3Key }
5. Backend        → save Document record, update item status → UPLOADED, fire audit event
```

**S3 path structure:**
```
Individual user:  individual/{user_id}/{case_id}/{item_id}/{filename}
Tenant:           tenant/{tenant_id}/{case_id}/{item_id}/{filename}
```

**ZIP download:**
- Backend streams files from S3 → zips on the fly → streams to client (no temp disk usage)
- Flat mode ZIP:       `{referenceNo}/{filename}`
- Structured mode ZIP: `{referenceNo}/{itemName}/{filename}`
- Text items included as `{itemName}.txt`

**Admin endpoints:**
```
POST /api/cases/{id}/items/{itemId}/upload-url      → presigned PUT URL (admin upload)
POST /api/cases/{id}/items/{itemId}/confirm-upload  → confirm + save Document record
DELETE /api/documents/{docId}                       → delete a document
```

**Public customer endpoints (no auth, token-based):**
```
GET  /api/upload/{token}                            → case + checklist (no sensitive admin data)
POST /api/upload/{token}/items/{itemId}/upload-url  → presigned URL for customer
POST /api/upload/{token}/items/{itemId}/confirm     → confirm customer upload
POST /api/upload/{token}/items/{itemId}/text        → submit text value
```

---

## Module 6 — Link Sharing

Admin shares any uploaded document as a protected link.

**ShareLink fields:**
- `token` — UUID, unique, unguessable
- `password_hash` — optional bcrypt hash
- `expires_at` — optional expiry timestamp
- `max_views` — optional view cap
- `view_count` — incremented on each valid access

**Link URL:** `app.docpanther.com/shared/{token}`

**Access flow:**
1. User opens link → backend checks expiry + view count
2. If password-protected → frontend shows password form → POST to validate
3. On success → backend generates short-lived presigned S3 GET URL → frontend serves file

**Endpoints:**
```
POST   /api/documents/{docId}/share     → create share link
GET    /api/cases/{id}/share-links      → list share links for a case
DELETE /api/share-links/{linkId}        → revoke link

GET  /api/shared/{token}               → public: link metadata (is it password protected, expired?)
POST /api/shared/{token}/access        → public: validate password → return presigned S3 URL
```

---

## Module 7 — Audit Log

Every action = one append-only row in `audit_logs`. Never updated.

**Actions tracked:**
```
CASE_CREATED, CASE_UPDATED, CASE_DELETED
FILE_UPLOADED, FILE_APPROVED, FILE_REJECTED, FILE_DELETED
TEXT_SUBMITTED
REMINDER_SENT
LINK_SHARED, LINK_VIEWED, LINK_PASSWORD_FAILED
```

All modules write to AuditService. Extractable to DynamoDB/Kinesis later without touching other modules.

---

## Module 8 — Notifications

**Email triggers (via AWS SES):**
- Case created → upload link sent to customer
- Admin clicks "Send Reminder" → reminder email to customer
- Team member invited → invite email

**In-app triggers:**
- File uploaded by customer → notify case owner
- All required items complete → notify case owner
- Shared link accessed → optional notify

Email templates stored in DB, customizable per tenant.

**Endpoints:**
```
GET  /api/notifications         → list in-app notifications for current user
POST /api/notifications/read    → mark as read
```

---

## Database Architecture

### Control Plane DB — India (ap-south-1), always
Only identity + tenant registry. No business data here.
```
users               (id, email, google_id nullable, name, avatar_url,
                     password_hash nullable, email_verified, created_at)
tenants             (id, slug, name, region, plan, billing_address,
                     country, created_by, created_at)
user_tenant_roles   (user_id, tenant_id, role)
email_verifications (id, user_id, token, expires_at, used_at)
password_resets     (id, user_id, token, expires_at, used_at)
```

### Per-Region Tenant DB — in tenant's chosen region
Full product data for that tenant:
```
cases, checklist_items, documents
templates, template_items
audit_logs, share_links
notifications, email_templates
```

### Individual User DB — India (ap-south-1)
Same schema as per-region DB, shared instance for all individual users.

### Redis — per region
- JWT refresh tokens (TTL = 7 days)
- Rate limiting counters
- Tenant-to-region lookup cache (TTL = 1 hour)

---

## Backend Architecture — Java Spring Boot Monolith

Packaged as modules — extractable to microservices later without a rewrite.

```
com.docpanther
├── auth/           → Google OAuth, JWT issue/refresh/revoke
├── tenant/         → Org CRUD, member invites, region routing
├── cases/          → Case CRUD, upload token generation
├── checklist/      → Checklist items, templates, item status flow
├── storage/        → S3 presigned URLs, confirm upload, ZIP streaming
├── sharing/        → ShareLink create/access/password validation
├── notifications/  → SES email, in-app notifications, reminders
├── audit/          → AuditLog service (all modules call this)
└── common/         → Security config, error handling, region router, rate limiter
```

**Key libraries:**
- Spring Boot 3.2, Spring Security, Spring Data JPA
- AWS SDK v2 (S3, SES, Secrets Manager)
- Flyway (DB migrations)
- jjwt (JWT)
- Bucket4j + Redis (rate limiting)
- Lombok, MapStruct

**Region routing:**
- JWT or subdomain → extract tenant ID → lookup region in control plane DB (cached in Redis)
- Switch DataSource to that region's RDS → all DB calls use regional connection

---

## AWS Infrastructure

```
Route53 (*.docpanther.com wildcard DNS)
         ↓
CloudFront + WAF
  - Rate limiting rules
  - Geo-blocking (optional)
  - SQL injection / XSS managed rule groups
  - Hides origin IP
         ↓
ALB  (Security Group: only accept traffic from CloudFront IPs)
         ↓
ECS Fargate (Spring Boot container, auto-scaling)
         ↓
RDS Aurora PostgreSQL (Multi-AZ, private subnet)
ElastiCache Redis      (private subnet)

S3 bucket per region:
  docpanther-ap-south-1
  docpanther-us-east-1
  docpanther-eu-central-1
  docpanther-me-central-1

AWS SES        → transactional email
Secrets Manager → DB creds, OAuth secrets, JWT secret
Shield Standard → always-on DDoS protection (free tier)
```

**Security layers:**
| Layer | What it does |
|---|---|
| Shield Standard | Absorbs volumetric DDoS at AWS network edge — free |
| CloudFront | Absorbs HTTP flood at edge, hides origin IP |
| WAF | Rate limiting, SQL injection, XSS, geo-blocking rules |
| ALB Security Group | Only CloudFront IPs can reach backend |
| Bucket4j (in-app) | Per-IP and per-user API rate limiting |
| JWT (15 min expiry) | Short-lived tokens limit blast radius of token theft |
| Presigned S3 URLs | Files never touch backend — backend stays stateless |
| VPC private subnets | Backend + DB not publicly reachable |
| Secrets Manager | No hardcoded credentials anywhere |

---

## Build Phases

| Phase | What gets built |
|---|---|
| **1** | Spring Boot project, Flyway migrations, Google OAuth + JWT, individual user registration, `/api/auth/*`, `/api/auth/me` |
| **2** | Case CRUD, checklist items (FILE_UPLOAD + TEXT_INPUT), S3 presigned upload flow, confirm upload, audit log |
| **3** | Templates (create, apply to case), ZIP download streaming, customer public upload portal (token-based) |
| **4** | Link sharing (password-protected), SES email notifications, reminder sending |
| **5** | Tenant registration, region selection, region routing (DataSource switching), team member invites |
| **6** | Next.js frontend (web/) — auth, dashboard, case management, upload portal UI |
| **7** | AWS infra (CDK/Terraform), CloudFront + WAF config, ECS deployment, per-region setup |

---

## Repo Structure

```
docpanther/
├── demo-website/       Next.js static marketing + demo (done)
├── web/                Next.js product frontend (Phase 6)
├── backend/            Java Spring Boot monolith (Phase 1–5)
│   ├── src/main/java/com/docpanther/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/
│   └── pom.xml
├── infra/              AWS CDK or Terraform (Phase 7)
└── PLAN.md             ← this file
```
