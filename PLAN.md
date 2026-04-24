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

## Module 3 — File System & Folder Management

The dashboard shows a **file explorer** — folders, cases, and directly uploaded files — like a lightweight Google Drive. S3 is the storage backend; the folder tree lives in the DB.

### Folder Structure
- User can create named folders at root level or nested inside other folders (unlimited depth)
- A **Case** can live inside a folder OR at root level (`folder_id` nullable)
- Files can be uploaded directly into any folder (not via a case) — "manual upload"
- Folder tree is stored in DB (`folders` table with `parent_id` self-reference)

### Dashboard View
```
My Files (root)
├── 📁 HDFC Bank Loans
│   ├── 📋 Case: Rahul Sharma — LOAN-001   [PARTIAL]
│   ├── 📋 Case: Priya Singh — LOAN-002    [PENDING]
│   └── 📄 template_guide.pdf              (manually uploaded)
├── 📁 Q1 Collections
│   └── 📋 Case: Amit Kumar — INV-101      [COMPLETE]
└── 📋 Case: Walk-in — MISC-009            [PENDING]  (root level)
```

### Operations
- **Folder**: create, rename, delete (deletes contents recursively), move
- **Case**: create inside folder or at root, move between folders
- **File**: manual upload, rename, delete, move, download
- **Search**: full-text search across folder names, case names, reference numbers, file names
- **Permissions**: folder-level — owner can share with specific users (VIEW or EDIT)

### Permission Model
```
OWNER   → full control (create, rename, delete, share)
EDIT    → can upload, create cases, rename within folder
VIEW    → read-only, can download files
```
- Permissions are inherited by subfolders and their contents
- Individual users: share with any registered user
- Tenant users: share within org members only

### DB Tables (added to product schema)
```
folders (
  id, parent_id nullable,   -- null = root level
  name, owner_id,
  tenant_id nullable,        -- null = individual user
  created_at, updated_at
)

folder_permissions (
  id, folder_id, user_id,
  permission  ENUM(VIEW, EDIT, OWNER),
  granted_by, granted_at
)

file_nodes (                  -- directly uploaded files (not via case)
  id, folder_id,
  name, s3_key, size_bytes, content_type,
  uploaded_by, created_at
)
```

Cases table gets: `folder_id UUID nullable REFERENCES folders(id)`

### Endpoints
```
GET    /api/fs                          → list root contents (folders + cases + files)
GET    /api/fs/{folderId}               → list folder contents
POST   /api/fs/folders                  → create folder { name, parentId? }
PUT    /api/fs/folders/{id}             → rename folder
DELETE /api/fs/folders/{id}             → delete folder (recursive)
POST   /api/fs/folders/{id}/move        → move folder to new parent

POST   /api/fs/folders/{id}/upload-url  → presigned PUT URL for direct file upload
POST   /api/fs/folders/{id}/confirm-upload → confirm direct file upload
PUT    /api/fs/files/{id}               → rename file
DELETE /api/fs/files/{id}               → delete file
POST   /api/fs/files/{id}/move          → move file to different folder

POST   /api/fs/folders/{id}/permissions → grant permission to a user
DELETE /api/fs/folders/{id}/permissions/{userId} → revoke permission

GET    /api/fs/search?q=               → search across all accessible folders/cases/files
```

---

## Module 4 — Case Management

A **Case** = one document collection request for one customer. Lives inside a folder or at root.

**Case fields:**
- `folder_id` — nullable; null means root level
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
GET    /api/cases               → list cases (paginated, filter by folder/status/tags)
POST   /api/cases               → create case { folderId?, ...fields }
GET    /api/cases/{id}          → case detail + checklist items
PUT    /api/cases/{id}          → update case metadata
DELETE /api/cases/{id}          → delete case
POST   /api/cases/{id}/move     → move case to different folder
POST   /api/cases/{id}/remind   → send reminder email to customer
GET    /api/cases/{id}/download → stream ZIP of all documents
GET    /api/cases/{id}/audit    → paginated audit log for case
```

---

## Module 5 — Checklist & Templates

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

## Module 6 — File Storage (S3 + Presigned URLs)

Backend never handles file bytes. Client uploads directly to S3.

**How the upload link works (important):**
- The email/link sent to customers is just `{tenant}.docpanther.com/upload/{token}` — a permanent URL
- This link never expires (unless admin sets `expires_at` on the case)
- When the customer opens the link (today, tomorrow, next week), the backend generates a **fresh** presigned S3 PUT URL on-demand at that moment
- The presigned URL has a 15-min expiry — that's just the window to complete the actual file PUT to S3
- So the customer always gets a fresh short-lived presigned URL whenever they are actively uploading

**Upload flow:**
```
Customer opens upload link any time
    ↓
GET /api/upload/{token}  → backend returns case + checklist (checks case not expired)
    ↓
Customer clicks Upload on a checklist item
    ↓
POST /api/upload/{token}/items/{itemId}/upload-url
    → backend generates fresh S3 presigned PUT URL (15 min) → returns to browser
    ↓
Browser PUT file directly to S3  (backend never touches bytes)
    ↓
POST /api/upload/{token}/items/{itemId}/confirm  { filename, size, s3Key }
    → backend saves Document record, updates item status → UPLOADED, fires audit event
```

**S3 path structure:**
```
Individual user:  individual/{user_id}/{case_id}/{item_id}/{filename}
Tenant (pod):     tenant/{tenant_id}/{case_id}/{item_id}/{filename}
```

**ZIP download:**
- Backend streams files from S3 → zips on the fly → streams to client (no temp disk usage)
- Flat mode ZIP:       `{referenceNo}/{filename}`
- Structured mode ZIP: `{referenceNo}/{itemName}/{filename}`
- Text items included as `{itemName}.txt`

**Admin endpoints:**
```
POST   /api/cases/{id}/items/{itemId}/upload-url      → presigned PUT URL (admin upload)
POST   /api/cases/{id}/items/{itemId}/confirm-upload  → confirm + save Document record
DELETE /api/documents/{docId}                         → delete a document
GET    /api/cases/{id}/download                       → stream ZIP of all documents
```

**Public customer endpoints (no auth, token-based):**
```
GET  /api/upload/{token}                            → case + checklist (no sensitive admin data)
POST /api/upload/{token}/items/{itemId}/upload-url  → fresh presigned PUT URL generated on-demand
POST /api/upload/{token}/items/{itemId}/confirm     → confirm upload, save Document record
POST /api/upload/{token}/items/{itemId}/text        → submit text value
```

---

## Module 7 — Link Sharing

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

## Module 8 — Audit Log

Every action = one append-only row in `audit_logs`. Never updated.

**Actions tracked:**
```
FOLDER_CREATED, FOLDER_RENAMED, FOLDER_DELETED, FOLDER_MOVED
FOLDER_PERMISSION_GRANTED, FOLDER_PERMISSION_REVOKED
FILE_UPLOADED, FILE_RENAMED, FILE_DELETED, FILE_MOVED
CASE_CREATED, CASE_UPDATED, CASE_DELETED, CASE_MOVED
CHECKLIST_FILE_UPLOADED, CHECKLIST_FILE_APPROVED, CHECKLIST_FILE_REJECTED
TEXT_SUBMITTED
REMINDER_SENT
LINK_SHARED, LINK_VIEWED, LINK_PASSWORD_FAILED
```

All modules write to AuditService. Extractable to DynamoDB/Kinesis later without touching other modules.

---

## Module 9 — Notifications

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

## Database Architecture — Pod Model

### Concept
Instead of a single shared DB per region, tenant data lives in **pods**. A pod is a self-contained PostgreSQL instance (RDS Aurora) that holds all product tables for one or more tenants.

```
Control Plane (India, always)
    ↓ lookup: tenant_id → pod_id → connection URL
Pod A — ap-south-1   (shared: tenants T1, T2, T3 — small/free tier)
Pod B — us-east-1    (dedicated: tenant T4 — large enterprise)
Pod C — eu-central-1 (dedicated: tenant T5 — EU enterprise)
Pod D — ap-south-1   (split from Pod A when it grew too large)
```

**Pod lifecycle:**
- New tenant → assigned to a shared pod in their chosen region
- Tenant grows large → extracted to a dedicated pod (zero downtime migration)
- Pod overloaded with multiple tenants → one tenant moved to a new pod
- Pod too big for one region → moved to another region (data sovereignty change)
- Individual users → always on the India shared pod

**Why pods beat one-table-per-region:**
- One table = noisy neighbour problem (large tenant starves others)
- Pod = full isolation — CPU, memory, IOPS, storage all dedicated when needed
- Easy to move: change the pod_id mapping in control plane, no app code changes
- Compliance: a tenant's data is physically isolated, not just logically

### Control Plane DB — India (ap-south-1), always
Identity, tenant registry, and pod routing map. No business data here.
```
users               (id, email, google_id nullable, name, avatar_url,
                     password_hash nullable, email_verified, created_at)
tenants             (id, slug, name, region, plan, billing_address,
                     country, created_by, created_at)
user_tenant_roles   (user_id, tenant_id, role)
email_verifications (id, user_id, token, expires_at, used_at)
password_resets     (id, user_id, token, expires_at, used_at)

pods                (id, region, db_url, status ENUM(ACTIVE, DRAINING, FULL),
                     type ENUM(SHARED, DEDICATED), created_at)
tenant_pod_mapping  (tenant_id, pod_id, assigned_at)
                     -- control plane checks this to route every DB call
```

### Pod DB Schema (identical on every pod)
Each pod runs the same Flyway migrations. Tenant data isolated by `tenant_id` column.
```
folders, folder_permissions, file_nodes
cases, checklist_items, documents
templates, template_items
audit_logs, share_links
notifications, email_templates
```

### Pod Routing (in backend)
```
1. Request arrives with tenant_id (from JWT claim or subdomain lookup)
2. Check Redis cache: tenant_id → pod connection URL  (TTL 1 hour)
3. Cache miss → query control plane: SELECT pod FROM tenant_pod_mapping WHERE tenant_id = ?
4. Store in Redis → use that DataSource for all DB calls in this request
5. Tenant migrated to new pod? → control plane updated → Redis TTL expires → auto-rerouted
```

### Individual User Pod — India (ap-south-1)
Individual users are always on the India shared pod. Same schema, `tenant_id` is NULL.

### Redis — per region
- JWT refresh tokens (TTL = 7 days)
- Rate limiting counters
- Tenant → pod connection URL cache (TTL = 1 hour)

---

## Backend Architecture — Java Spring Boot Monolith

Packaged as modules — extractable to microservices later without a rewrite.

```
com.docpanther
├── auth/           → Form-based + Google OAuth, JWT issue/refresh/revoke, email verify
├── tenant/         → Org CRUD, member invites, region routing
├── filesystem/     → Folders CRUD, file_nodes, permissions, search
├── cases/          → Case CRUD, upload token generation, folder placement
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
ECS Fargate (Spring Boot — auto-scaling, stateless)
         ↓
Control Plane RDS Aurora (India, always)  — identity + pod routing map
         +
Pod RDS Aurora instances (per region, per pod)
  Pod A: ap-south-1  shared  → tenants T1, T2, T3
  Pod B: us-east-1   dedicated → tenant T4
  Pod C: eu-central-1 dedicated → tenant T5
  (new pods provisioned via Terraform as tenants grow)
         +
ElastiCache Redis (per region) — JWT tokens, rate limiting, pod routing cache

S3 bucket per region (one bucket, paths scoped by tenant_id):
  docpanther-ap-south-1
  docpanther-us-east-1
  docpanther-eu-central-1
  docpanther-me-central-1

AWS SES         → transactional email
Secrets Manager → pod DB creds (one secret per pod), OAuth secrets, JWT secret
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
| **1** | Spring Boot project, Flyway migrations, form-based auth (register/login/verify email/reset password), Google OAuth (individual), JWT + Redis, `/api/auth/*` |
| **2** | File system module — folders CRUD, folder permissions, direct file upload (presigned), search, audit log |
| **3** | Case CRUD (with folder placement), checklist items (FILE_UPLOAD + TEXT_INPUT), S3 presigned upload, confirm upload |
| **4** | Templates (create, apply to case), ZIP download streaming, customer public upload portal (token-based) |
| **5** | Link sharing (password-protected), SES email notifications, reminder sending |
| **6** | Tenant registration (form-based), region selection, region routing (DataSource switching), team member invites |
| **7** | Next.js frontend (web/) — auth, file explorer dashboard, case management, upload portal UI |
| **8** | AWS infra (CDK/Terraform), CloudFront + WAF config, ECS deployment, per-region setup |

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
