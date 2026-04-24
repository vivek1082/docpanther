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

**Customer Upload URL format:**
- Tenant user:     `hdfc.docpanther.com/{shortToken}`   (subdomain = tenant slug)
- Individual user: `app.docpanther.com/{shortToken}`
- `shortToken` is a short random URL-safe string (10 chars, e.g. nanoid) — not a UUID
- The subdomain identifies the tenant; the token identifies the case
- URL is human-shareable, copy-pasteable, works in WhatsApp/email without breaking

**Case fields:**
- `folder_id` — nullable; null means root level
- `reference_no` — internal ref (e.g. LOAN-2024-001)
- `customer_name`, `customer_email`
- `tags[]` — for filtering/grouping
- `status` — PENDING / PARTIAL / COMPLETE (derived from checklist item statuses)
- `storage_mode` — FLAT or STRUCTURED (affects ZIP download structure, not S3 path)
- `upload_token` — short random string (10 chars), unique — powers the customer upload URL
- `expires_at` — admin sets this at case creation: 7 days / 30 days / custom date / never
- `max_file_size_mb` — per-case file size limit set by admin (e.g. 10MB, 50MB, 100MB)
- `allowed_file_types` — admin picks allowed extensions/types at case level (e.g. PDF, JPEG, DOCX, any)

**Case creation options (admin chooses):**
- Link expiry: 7 days / 30 days / 90 days / custom date / never
- Max file size: 5MB / 10MB / 25MB / 50MB / 100MB / custom
- Allowed file types: PDF only / Images (JPG, PNG) / Documents (PDF, DOCX, XLSX) / All / custom list

These defaults can also be set at the tenant level and overridden per case.

**Endpoints:**
```
GET    /api/cases               → list cases (paginated, filter by folder/status/tags)
POST   /api/cases               → create case { folderId?, expiresAt?, maxFileSizeMb?, allowedFileTypes[], ...}
GET    /api/cases/{id}          → case detail + checklist items
PUT    /api/cases/{id}          → update case metadata (including expiry, file limits)
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

### FILE_UPLOAD item — per-item file restrictions
Each FILE_UPLOAD item can override the case-level defaults:
- `max_file_size_mb` — override case-level limit for this specific item (e.g. passport scan = 5MB)
- `allowed_file_types` — override allowed types for this item (e.g. passport = JPG/PNG/PDF only)
- `allow_multiple` — whether customer can upload multiple files for this item
- Validation enforced both client-side (UI) and server-side (before generating presigned URL)

### Item Status Flow
```
PENDING → UPLOADED → APPROVED
                  ↘ REJECTED → PENDING  (customer re-uploads)
```

### Templates
- Reusable lists of checklist items (name, type, required, description, order, file restrictions)
- Global templates (DocPanther defaults) + tenant-specific templates
- Creating a case: pick a template → items are **copied** into the case (independent snapshot)
- Template items carry their file size/type restrictions; admin can override per case after applying

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

**How the upload link works:**
- Customer URL: `hdfc.docpanther.com/{shortToken}` — clean, shareable, works in any messaging app
- This link is permanent — never expires unless admin set an `expires_at`
- When customer opens the link the backend checks: is case expired? if yes → show expired screen
- When customer clicks Upload on an item, backend generates a **fresh** presigned S3 PUT URL on-demand
- The presigned URL has 15-min expiry — only the window to complete the actual S3 PUT
- Customer can return tomorrow and upload remaining items — they always get a fresh presigned URL

**Validation before issuing presigned URL (server-side enforced):**
- Case not expired (`expires_at` check)
- File size within limit (`Content-Length` header checked; S3 condition key `content-length-range` embedded in presigned URL so S3 itself rejects oversized uploads)
- File type in allowed list (checked by extension + MIME type)
- Item not already APPROVED (can't re-upload an approved item)

**Partial uploads — uploading one document now, rest later:**

The 15-min presigned URL is **per upload action**, not for the entire case. Each item gets its own independent presigned URL only when the customer actively clicks Upload on that item. There is no "session" that expires.

```
Day 1 — Customer opens link, uploads Item 1 only:
  Open hdfc.docpanther.com/{token} → sees 10 items
  Click Upload on Item 1 → POST .../upload-url → get fresh presigned URL (15 min clock starts)
  PUT file to S3 → POST confirm → Item 1 = UPLOADED ✓
  Close browser. Done for today.

Day 3 — Customer comes back, uploads Items 2 and 5:
  Open same link → sees Items 2-10 still PENDING, Item 1 UPLOADED
  Click Upload on Item 2 → POST .../upload-url → get fresh presigned URL (new 15-min clock)
  PUT file → confirm → Item 2 = UPLOADED ✓
  Click Upload on Item 5 → new presigned URL → upload → Item 5 = UPLOADED ✓
  Close browser.

Next week — admin sees case is PARTIAL, sends reminder email
  Customer opens link again → uploads remaining items
```

Key point: the 15 minutes is only the time allowed to complete the S3 PUT for one file once the customer has started uploading it. If a file is 500MB and the connection is slow, 15 minutes is enough. If not, the presigned URL is regenerated on retry — no impact on the overall case.

**Upload flow:**
```
Customer opens  hdfc.docpanther.com/{shortToken}  any time
    ↓
Frontend → GET /api/upload/{shortToken}
    → backend validates: not expired → returns case + checklist (no sensitive admin data)
    ↓
Customer selects file and clicks Upload on one checklist item
    ↓
Frontend → POST /api/upload/{shortToken}/items/{itemId}/upload-url  { filename, size, mimeType }
    → backend validates: size ≤ limit, type in allowed list, case not expired
    → generates fresh S3 presigned PUT URL (15 min) with embedded size constraint
    → returns presigned URL to browser
    ↓
Browser PUT file directly to S3   (backend never touches bytes)
    ↓
Frontend → POST /api/upload/{shortToken}/items/{itemId}/confirm  { filename, size, s3Key }
    → backend saves Document record, updates item status → UPLOADED, fires audit event
    ↓
Customer can close browser — remaining items stay PENDING until they return
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

**Public customer endpoints (no auth — resolved via subdomain + shortToken):**
```
GET  /api/upload/{shortToken}                            → case + checklist (validates expiry)
POST /api/upload/{shortToken}/items/{itemId}/upload-url  → validate size+type, generate fresh presigned URL
POST /api/upload/{shortToken}/items/{itemId}/confirm     → confirm upload, save Document record
POST /api/upload/{shortToken}/items/{itemId}/text        → submit text value
```
The subdomain (`hdfc`) is extracted from the `Host` header to resolve the tenant; the shortToken identifies the case.

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
Audit writes are async (`@Async`) — never slow down the main request.

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

## Module 10 — SuperAdmin Portal (Internal — DocPanther ops only)

This is YOUR internal control panel, Vivek. Separate from the product UI. Accessible only to `SUPER_ADMIN` role users.

### What it provides

**Tenant management:**
- List all tenants with: plan, region, pod, storage used, case count, MRR
- View tenant detail, change plan (FREE → STARTER etc.)
- Suspend/reactivate tenant
- Impersonate tenant (generate short-lived debug token — fully audited)

**Pod management:**
- List all pods with health: tenant count, storage GB, DB size, status (ACTIVE/DRAINING/FULL)
- Provision new pod in a given region (triggers Terraform automation)
- Move tenant to a different pod (background migration job)
- Mark pod as DRAINING (no new tenants assigned, existing migrate out)

**Platform stats:**
- Total tenants, individuals, cases, documents, total storage GB
- MRR breakdown by plan
- Active pods per region

**User lookup:**
- Find any user by email across control plane
- See their tenant membership, plan, login history

**Endpoints:** `/api/admin/**` — all require `SUPER_ADMIN` role. See `contracts/openapi.yaml` paths tagged `superadmin`.

**Security:** SuperAdmin endpoints are behind a separate internal ALB that is NOT routed through CloudFront — only accessible via VPN or bastion. Never exposed publicly.

---

## Module 11 — Education Vertical (Coaching Institutes, Schools, Colleges)

A complete vertical built on top of the existing infrastructure — no separate codebase. The institute is a tenant. Teachers are tenant members. Students are a new role type.

### The Problem It Solves
IAS coaching institutes, school chains, colleges are sharing notes, assignments, and resources over WhatsApp groups today. A batch of 300 students gets the wrong PDF because someone forwarded it incorrectly. There's no version control, no access control, no audit trail. DocPanther solves this cleanly.

---

### Core Concepts

**Institute** = Tenant (e.g., `visionias.docpanther.com`)

**Batch** = A group of students studying together (e.g., `IAS Batch 10 — 2025`)
- An institute can have multiple batches
- A student can be enrolled in multiple batches

**Subject** = A topic within a batch (e.g., History, Polity, Geography)
- Each subject has one or more teachers assigned

**Teacher** = A `TENANT_MEMBER` with `TEACHER` sub-role — can only upload materials to their assigned subjects

**Student** = New role `STUDENT` — can log in to the institute portal, view approved materials for their enrolled batches, upload to their personal folder only

**Material** = A note, PDF, assignment, or resource uploaded by a teacher to a subject
- Status: `PENDING_REVIEW → APPROVED / REJECTED`
- On APPROVED → email blast to ALL enrolled students in that batch

---

### Roles in Education Vertical

```
TENANT_ADMIN   → Institute coordinator — manages batches, subjects, teachers, students, approves materials
TEACHER        → Uploads materials to assigned subjects (sub-role of TENANT_MEMBER)
STUDENT        → Reads approved materials + uploads to personal folder only
```

---

### Data Model (new tables in pod DB)

```sql
batches (
  id, tenant_id, name, year, description,
  created_by, created_at, updated_at
)

batch_subjects (
  id, batch_id, name, description,
  created_at
)

subject_teachers (
  subject_id, user_id   -- teacher must be TENANT_MEMBER with TEACHER sub-role
)

batch_enrollments (
  batch_id, student_id (user_id),
  enrolled_at
)
-- student can be in multiple batches (e.g., enrolled in IAS Batch 10 AND PT Batch 3)

materials (
  id, subject_id, batch_id, tenant_id,
  title, description,
  uploaded_by (teacher user_id),
  document_id FK → documents table (actual file in S3),
  status  ENUM(PENDING_REVIEW, APPROVED, REJECTED),
  rejection_note,
  approved_by, approved_at,
  created_at
)

student_storage (
  user_id, tenant_id,
  quota_bytes DEFAULT 5368709120,  -- 5 GB
  used_bytes  DEFAULT 0
)
-- updated on every student upload/delete
```

---

### Material Upload & Approval Flow

```
1. Teacher logs into visionias.docpanther.com
2. Opens subject → uploads PDF note (same S3 presigned URL flow)
3. Material created with status = PENDING_REVIEW
4. Admin sees notification: "New material pending review"

5. Admin opens material → preview → clicks APPROVE or REJECT
6. On APPROVE:
   → Material status = APPROVED
   → Audit log: MATERIAL_APPROVED
   → Email blast fires (async): ALL students enrolled in that batch get email
     Subject: "New material available: History — Chapter 5 Modern India"
     Body: institute name, subject, material title, login link
7. On REJECT:
   → Teacher gets notified with rejection note
   → Material status = REJECTED (teacher can re-upload revised version)
```

---

### Student Experience

**Login:** `visionias.docpanther.com/student` → email + password → student dashboard

**Dashboard shows:**
```
My Batches
├── IAS Batch 10 — 2025
│   ├── History (3 materials)
│   │   ├── ✅ Modern India — Chapter 5.pdf       [Download]
│   │   ├── ✅ Ancient India — Overview.pdf       [Download]
│   │   └── ✅ Medieval India — Sultanate.pdf     [Download]
│   ├── Polity (2 materials)
│   └── Geography (1 material)
└── PT Batch 3 — 2025
    └── Current Affairs (5 materials)

My Storage  (1.2 GB / 5 GB used)
└── 📁 Personal Notes
    ├── my_polity_notes.pdf
    └── handwritten_scan.jpg
```

**Student rules:**
- Can only see batches they are enrolled in
- Can only see materials with `status = APPROVED`
- Can download approved materials (presigned S3 GET URL, short-lived)
- Can upload to their personal folder only (quota enforced server-side)
- Cannot see other students' personal folders
- Cannot see PENDING_REVIEW or REJECTED materials

---

### Student Personal Folder (5 GB)

- Every student gets a personal folder at: `tenant/{tenant_id}/students/{student_id}/`
- Quota: 5 GB by default (configurable per institute plan)
- Uses same S3 presigned URL flow — before issuing presigned URL, backend checks:
  ```
  used_bytes + new_file_size ≤ quota_bytes  →  proceed
  else → 429 Quota Exceeded
  ```
- `student_storage.used_bytes` updated after confirm-upload and file delete
- Student can create sub-folders within their personal folder

---

### Institute Admin Capabilities

- Create/edit/delete batches
- Add subjects to a batch, assign teachers to subjects
- Enroll students in batches (bulk CSV import: name, email → invite email sent)
- Remove student from a batch
- Approve/reject materials with notes
- View all materials across all batches with filter by status/subject
- View per-student storage usage
- Adjust student quota individually (e.g., final-year student gets 10 GB)
- Download all materials for a subject as ZIP

---

### Endpoints (new, to be added to openapi.yaml)

```
# Batch management
GET    /api/edu/batches                          → list batches
POST   /api/edu/batches                          → create batch
GET    /api/edu/batches/{id}                     → batch detail + subjects
PUT    /api/edu/batches/{id}                     → update batch
DELETE /api/edu/batches/{id}                     → delete batch

# Subject management
POST   /api/edu/batches/{id}/subjects            → add subject
PUT    /api/edu/subjects/{subjectId}             → update subject
DELETE /api/edu/subjects/{subjectId}             → delete subject
POST   /api/edu/subjects/{subjectId}/teachers    → assign teacher
DELETE /api/edu/subjects/{subjectId}/teachers/{userId} → remove teacher

# Student enrollment
POST   /api/edu/batches/{id}/students            → enroll student(s) { emails[] }
DELETE /api/edu/batches/{id}/students/{userId}   → unenroll student

# Materials
GET    /api/edu/subjects/{subjectId}/materials   → list materials (admin: all; student: approved only)
POST   /api/edu/subjects/{subjectId}/materials/upload-url  → teacher: get presigned URL
POST   /api/edu/subjects/{subjectId}/materials/confirm     → teacher: confirm upload, create material
PUT    /api/edu/materials/{id}/approve           → admin: approve → triggers email blast
PUT    /api/edu/materials/{id}/reject            → admin: reject with note
DELETE /api/edu/materials/{id}                   → admin: delete material

# Student personal folder
GET    /api/edu/my/storage                       → student: folder contents + quota usage
POST   /api/edu/my/upload-url                    → student: presigned URL (quota checked)
POST   /api/edu/my/confirm-upload                → student: confirm upload
DELETE /api/edu/my/files/{fileId}                → student: delete file from personal folder

# Student dashboard
GET    /api/edu/my/batches                       → student: list enrolled batches + subjects + material counts
GET    /api/edu/my/batches/{batchId}/materials   → student: approved materials for a subject
```

---

### What Reuses Existing Infrastructure

| Existing | How Education Uses It |
|---|---|
| S3 presigned URL flow | Material upload by teacher, student personal folder upload |
| SES email notifications | Email blast on material approval, student invite emails |
| Audit log | MATERIAL_UPLOADED, MATERIAL_APPROVED, MATERIAL_REJECTED, STUDENT_ENROLLED |
| Tenant subdomain routing | `visionias.docpanther.com` — same routing mechanism |
| JWT + roles | STUDENT role added, same JWT system |
| Folder/file system | Student personal folder uses existing file_nodes + folders |
| Pod architecture | Education data lives in the same pod as the tenant — zero extra infra |

---

### Education Billing (add-on to tenant plans)

| Feature | Included in | Extra cost |
|---|---|---|
| Up to 50 students | Growth plan | — |
| Up to 500 students | Enterprise plan | — |
| Student personal storage (5 GB/student) | Education add-on | ₹2,999/month per 100 students |
| Bulk CSV student import | Growth+ | — |
| Material approval workflow | All plans | — |

---

### GTM for Education Vertical

**Beachhead customers:**
- IAS coaching institutes (300–2000 students per batch, 10–50 subjects)
- CA coaching (ICAI, Finshiksha, etc.)
- JEE/NEET coaching chains (Aakash, Allen regional franchises)
- School chains (Ryan International, DPS) for admin document workflows
- College placement cells (existing use case)

**Sales motion:**
- Coordinator/admin is the buyer — ₹4,999–₹14,999/month
- Students are users who create stickiness (their notes are on the platform)
- Network effect: when one coaching institute uses it, students recommend it to friends at other institutes
- WhatsApp group chaos is the pain point to lead with

**Differentiation:**
- Not a full LMS (no quizzes, no video) — just document sharing done right
- DPDP compliant (student data stays in India)
- Approval workflow prevents wrong material reaching students
- Students have their own storage — not just consumers

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
├── tenant/         → Org CRUD, member invites, region routing, pod DataSource router
├── filesystem/     → Folders CRUD, file_nodes, permissions, search
├── cases/          → Case CRUD, upload token generation, folder placement, ZIP download
├── checklist/      → Checklist items, templates, item status flow
├── storage/        → S3 presigned URLs, confirm upload, public upload portal
├── sharing/        → ShareLink create/access/password validation
├── notifications/  → SES email, in-app notifications, reminders
├── audit/          → AuditLog service (all modules call this, async writes)
├── superadmin/     → Internal ops: tenant mgmt, pod mgmt, platform stats, impersonation
└── common/         → Security config, error handling, shared interfaces (FileStorage, Mailer, AuditLogger)
```

**Module interface contracts (in `common/`):**
```java
FileStorage   → presignedPutUrl(), presignedGetUrl(), delete()
Mailer        → sendUploadLink(), sendReminder(), sendInvite()
AuditLogger   → log(action, actorType, actorId, tenantId, caseId, itemId, metadata)
```
All modules depend on these interfaces, never on concrete implementations.

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
| **7** | SuperAdmin portal — tenant management, pod management, platform stats, user lookup |
| **8** | Next.js frontend (web/) — auth, file explorer dashboard, case management, upload portal UI |
| **9** | AWS infra (Terraform), CloudFront + WAF config, ECS deployment, per-region pod setup |

---

## Billing Plans

### Individual Plans

| Plan | Price | Cases/month | Storage | Max file size | Features |
|---|---|---|---|---|---|
| **Free** | ₹0 | 5 | 1 GB | 10 MB | Basic templates, email link |
| **Pro** | ₹999/mo | 100 | 25 GB | 100 MB | Custom expiry, file type rules, ZIP download, audit log |
| **Business** | ₹2,499/mo | Unlimited | 100 GB | 500 MB | Everything + link sharing, reminders, priority support |

### Tenant / Enterprise Plans

| Plan | Price | Team members | Cases/month | Storage | Features |
|---|---|---|---|---|---|
| **Starter** | ₹4,999/mo | 5 | 200 | 50 GB | Subdomain, templates, audit log, SES email |
| **Growth** | ₹14,999/mo | 25 | Unlimited | 500 GB | Custom email templates, advanced permissions, dedicated pod option |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Dedicated pod, custom region, SSO/SAML, SLA, onboarding support |

**Notes:**
- Storage = sum of all uploaded files across all cases
- Overage: ₹2/GB beyond plan limit
- Annual discount: 20% off
- Free trial: 14 days on any paid plan
- Pod upgrade: Growth tenants can opt into a dedicated pod for ₹5,000/month extra

---

## Overall Architecture — How It All Fits Together

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER / APP                        │
│  app.docpanther.com        hdfc.docpanther.com           │
│  (admin dashboard)         (customer upload portal)      │
└───────────────┬────────────────────────┬─────────────────┘
                │                        │
                ▼                        ▼
┌──────────────────────────────────────────────────────────┐
│              CloudFront + WAF + Route53                  │
│   *.docpanther.com wildcard cert (ACM)                   │
│   WAF: rate limit, SQL injection, XSS rules              │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│           ALB  (only accepts CloudFront IPs)             │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│         ECS Fargate — Spring Boot (stateless)            │
│                                                          │
│  Request arrives:                                        │
│  1. Extract tenant from Host header subdomain            │
│  2. Check Redis: tenant → pod connection URL             │
│  3. Cache miss → query Control Plane DB → cache it       │
│  4. All DB queries go to that pod's Aurora               │
│  5. S3 operations go to that tenant's region bucket      │
└──────┬──────────────────────────┬────────────────────────┘
       │                          │
       ▼                          ▼
┌────────────────┐    ┌─────────────────────────────────┐
│ Control Plane  │    │  Pod Aurora (tenant's region)   │
│ Aurora (India) │    │  folders, cases, documents,     │
│ users, tenants │    │  audit_logs, share_links ...    │
│ pod routing map│    │                                 │
└────────────────┘    └─────────────────────────────────┘
       │                          │
       ▼                          ▼
┌────────────────┐    ┌─────────────────────────────────┐
│ ElastiCache    │    │  S3 bucket (tenant's region)    │
│ Redis          │    │  tenant/{tenant_id}/{case_id}/  │
│ JWT tokens     │    │  {item_id}/{filename}           │
│ pod cache      │    │                                 │
│ rate limiting  │    │  Files uploaded directly by     │
└────────────────┘    │  browser via presigned URL —    │
                      │  backend never touches bytes    │
                      └─────────────────────────────────┘

S3 upload flow (customer side):
  Browser → POST /api/upload/{token}/items/{id}/upload-url
         → Spring Boot → generate presigned PUT URL → return
  Browser → PUT file directly to S3 (no backend in the middle)
  Browser → POST confirm → Spring Boot → save Document record
```

**Key design principles:**
- Backend is fully stateless — ECS can scale horizontally, any instance handles any request
- Files never go through backend — S3 presigned URLs keep backend CPU/memory free
- Pod routing is transparent to the app — just a DataSource switch, no business logic changes
- Moving a tenant to a new pod = update one row in control plane + wait for Redis TTL to expire

---

## Honest Assessment — What's Strong and What's Risky

### What's genuinely good
- **The niche is real.** Loan officers, CA firms, real estate agents, HR teams — they all collect documents manually today (WhatsApp, email). The pain is genuine.
- **DPDP compliance angle** is a real differentiator. India's DPDP Act obligations kick in 2027. A product that is compliant by design (data residency, audit log, consent trail) is valuable — especially for NBFCs and healthtech. This is your moat.
- **The pod architecture** is sophisticated and correct. Most SaaS companies don't think about this until they're in pain. Planning it now is smart.
- **Checklist + upload portal** is the right UX. Better than "send us an email with attachments" and easier than asking a customer to use a full document management tool.
- **Solo builder with AI tooling** means you can move faster than a team of 3 who spend half their time in meetings.

### What's risky / needs honest thinking

**1. Competition from free tools is brutal.**
Customers are using Google Forms + Drive, WhatsApp, email. You're not competing with DocuSign — you're competing with "just send it on WhatsApp bhai." Your pitch has to be about organization, audit trail, and compliance — not just "easier uploads."

**2. Enterprise doesn't self-serve.**
HDFC won't sign up via a form at ₹14,999/month. That requires a sales person, a procurement process, a security review, and a DPA (Data Processing Agreement). Be realistic — your first 12 months is SMBs (CA firms, small NBFCs, real estate agencies) who CAN self-serve. Plan your GTM accordingly.

**3. India market price sensitivity is real.**
₹4,999/month for Starter might be too high for a 5-person CA firm. They'll ask "why not just use Google Drive?" You need either a strong compliance/audit answer or a freemium hook that gets them dependent before the paywall.

**4. Two startups, one person.**
DocPanther + Privyuh simultaneously is a lot. Privyuh (DPDP compliance) and DocPanther are adjacent but not the same customer journey. Either they converge (DocPanther IS the DPDP-compliant document collection product) or one will get neglected. Consider: is DocPanther the product and DPDP compliance a feature/selling point, not a separate SaaS?

**5. Build vs. buy commoditisation.**
In 2-3 years, something like this will be a commodity. Your moat has to be: deep workflow integrations (loan origination systems, HRMS, CRMs), compliance certifications (ISO 27001, SOC 2), and brand trust in regulated industries. Start planting those flags early.

### The bet worth making
The DPDP compliance + document collection combination for Indian regulated industries (NBFC, healthtech, edtech, D2C with KYC) — that's defensible. Go narrow, go deep, win that segment before expanding.

---

## Compliance Certifications — Required vs Good to Have

### What these certifications actually are

---

#### ISO 27001 — Information Security Management System
**What it is:** International standard (by ISO/IEC) for managing information security. Proves you have a formal system for identifying risks and controlling them. Most widely recognised globally — especially in India, EU, and Middle East.

**What it covers:** Access control, encryption, incident response, physical security, vendor management, HR security, business continuity.

**How to get it:**
1. Implement an ISMS (policies, procedures, controls)
2. Internal audit
3. Stage 1 audit — certifying body reviews your documentation
4. Stage 2 audit — certifying body inspects actual implementation
5. Certificate issued (valid 3 years, annual surveillance audits)

**Certifying bodies in India:** BSI India, Bureau Veritas, TÜV Rheinland, DNV

**Cost:** ₹8–25 lakh (consulting + audit + cert)
**Timeline:** 9–18 months
**Priority for DocPanther:** 🔴 **Critical** — Indian enterprises (NBFCs, hospitals, corporates) will ask for this before signing. Without it, you cannot sell to regulated enterprises.

---

#### SOC 2 Type II — System and Organisation Controls
**What it is:** US standard (by AICPA) for SaaS/cloud companies. Proves your security, availability, and confidentiality controls work consistently over a period (usually 6–12 months).

**Two types:**
- **Type I** — point-in-time snapshot of controls (faster, cheaper, less credible)
- **Type II** — 6–12 month audit period (what US enterprise customers actually want)

**Trust criteria:** Security (mandatory) + Availability, Processing Integrity, Confidentiality, Privacy (choose what's relevant)

**How to get it:**
1. Implement controls (access logs, encryption, incident response, change management)
2. Choose a CPA firm that does SOC 2 audits
3. Observation period (6–12 months)
4. Auditor issues SOC 2 report (not a public certificate — shared under NDA with customers)

**Cost:** $30,000–$80,000 USD for Type II (audit firm fees)
**Timeline:** 9–15 months for Type II
**Priority for DocPanther:** 🟡 **Good to have** — needed only when selling to US companies. Not urgent for India-first GTM, but needed for any US enterprise deal.

---

#### HIPAA — Health Insurance Portability and Accountability Act
**What it is:** US federal law covering protection of patient health information (PHI). Applies if DocPanther stores documents that contain health data (lab reports, prescriptions, insurance claims).

**Important:** There is no "HIPAA certification." You become HIPAA compliant by implementing required safeguards and signing a BAA (Business Associate Agreement) with each healthcare customer.

**What it requires:**
- PHI encrypted at rest and in transit (already planned — S3 + TLS)
- Audit logs of all access to PHI (already planned)
- Access controls — only authorised personnel access PHI
- BAA signed with every customer who sends PHI through DocPanther
- Breach notification within 60 days to HHS and affected individuals
- Data retention and destruction policies

**How to demonstrate it:** Get a third-party HIPAA risk assessment audit.
**Cost:** ₹5–15 lakh for risk assessment
**Timeline:** 3–6 months
**Priority for DocPanther:** 🟡 **Good to have** — needed only if targeting Indian healthtech (hospitals, insurance, diagnostic chains) or US healthcare. If a hospital uses DocPanther to collect patient documents → you must have this.

---

#### GDPR — General Data Protection Regulation (EU)
**What it is:** EU law governing how personal data of EU residents is handled. Not a certification — a legal compliance requirement. If any of your tenants are EU companies OR if EU residents upload documents through DocPanther → you must comply.

**Key requirements:**
- Data residency: EU data must stay in EU (your EU region pod covers this)
- Right to erasure: users can request their data be deleted
- Data breach notification: notify supervisory authority within 72 hours
- Privacy by Design: bake privacy into architecture (you are doing this)
- DPA (Data Processing Agreement) signed with every EU customer
- Cookie consent on website
- Appoint EU representative if you have no EU presence

**How to demonstrate it:** ISO 27701 certification (privacy extension of ISO 27001) is the most credible evidence of GDPR readiness.

**Cost of compliance:** ₹5–20 lakh (legal + technical implementation)
**Priority for DocPanther:** 🟡 **Good to have** — needed as soon as you have EU tenants. EU region pod is already planned, which handles the hardest part (data residency).

---

#### India DPDP — Digital Personal Data Protection Act 2023
**What it is:** India's comprehensive data protection law. Rules expected to be finalised and obligations kick in ~May 2027. If DocPanther handles personal data of Indian residents (which it does — customer names, emails, uploaded ID documents) → you must comply.

**What DocPanther must implement:**

| Requirement | What it means | DocPanther action needed |
|---|---|---|
| **Notice & Consent** | Tell users what data you collect and why, get consent | Consent banner on upload portal, privacy notice |
| **Purpose limitation** | Only collect data needed for the stated purpose | Don't use uploaded documents for anything else |
| **Data minimisation** | Don't collect more than needed | Already OK — user uploads only what checklist requests |
| **Data retention limits** | Don't store data longer than needed | Auto-delete cases/documents after configurable retention period |
| **Right to erasure** | User can request all their data be deleted | Implement `/api/me/delete-account` and case deletion that also purges S3 |
| **Right to correction** | User can correct inaccurate data | Allow profile + case metadata edits |
| **Breach notification** | Notify Data Protection Board + affected users of breaches | Incident response process + notification system |
| **Data fiduciary registration** | Large data handlers must register with DPB | Required only if DocPanther becomes a "Significant Data Fiduciary" (threshold TBD by rules) |
| **Children's data** | No behavioural tracking, parental consent required | Ensure no tracking pixels; T&C must restrict under-18 use |
| **Cross-border transfers** | Personal data of Indians can only be sent to countries approved by central government | Affects your EU/US pods — wait for approved country list |

**What DocPanther gets for free by design:**
- India data residency for individual users (already planned)
- Audit log of every access to every document (already planned)
- Tenant-chosen region (GDPR/DPDP compliance by design)
- Data isolation per pod (breach in one pod doesn't affect others)

**What still needs to be built:**
- Consent capture on the customer upload portal
- Configurable data retention + auto-delete job
- Right-to-erasure endpoint (full account + S3 deletion)
- Privacy policy + DPA templates for your tenants to use with their customers
- Incident response playbook

**Cost of DPDP compliance:** ₹2–8 lakh (legal + implementation) — much cheaper than GDPR since the architecture is already aligned.
**Priority for DocPanther:** 🔴 **Critical + Moat** — you sell to Indian businesses who will themselves need to comply. DocPanther being DPDP-ready is a selling point, not just a checkbox. This is your differentiation against Google Drive and WhatsApp.

---

#### ISO 27701 — Privacy Information Management System
**What it is:** Extension of ISO 27001 specifically for privacy. Adds privacy controls on top of your ISMS. Internationally recognised as evidence of GDPR and DPDP readiness.

**Requires ISO 27001 first.** Then adds ~35 additional privacy-specific controls.

**Cost:** ₹3–8 lakh on top of ISO 27001 (incremental)
**Timeline:** 3–6 months after ISO 27001
**Priority for DocPanther:** 🟢 **Nice to have** — get ISO 27001 first, then 27701 follows naturally and gives you a privacy credibility badge for enterprise sales.

---

### Certification Roadmap for DocPanther

| Timeline | Certification | Why |
|---|---|---|
| **Now (in product)** | DPDP compliance by design | Moat, GTM, required for Indian regulated customers |
| **Month 6–12** | GDPR compliance (legal + DPA templates) | Needed as soon as first EU tenant signs up |
| **Year 1–2** | ISO 27001 | Gate-opener for Indian enterprise sales |
| **Year 2** | ISO 27701 | Privacy badge, builds on 27001 |
| **Year 2–3** | SOC 2 Type II | Needed for US enterprise deals |
| **Year 2–3** | HIPAA risk assessment | If targeting healthtech/hospitals |

**Practical advice:** Don't try to get certifications before you have customers. Get ISO 27001 when your first enterprise prospect asks for it — that conversation is a sales forcing function. Until then, build the controls into the product (audit logs, encryption, access control) so certification is fast when you need it.

---

## AWS Cost Estimate

### Phase 1 — Early stage (0–50 tenants, India only)

| Service | Config | Monthly cost |
|---|---|---|
| Control Plane RDS Aurora | db.t3.medium, single-AZ | ~$50 |
| Pod RDS Aurora (1 shared pod) | db.t3.medium, single-AZ | ~$50 |
| ECS Fargate | 1 vCPU / 2GB, 2 tasks | ~$60 |
| ElastiCache Redis | cache.t3.micro | ~$15 |
| ALB | 1 load balancer | ~$18 |
| CloudFront | 100 GB transfer | ~$10 |
| S3 | 100 GB storage + requests | ~$5 |
| SES | 10,000 emails | ~$1 |
| Route53 | Hosted zone + queries | ~$2 |
| WAF | Basic rules | ~$10 |
| Secrets Manager | 5 secrets | ~$2 |
| **Total** | | **~$223/month** |

Break-even: 5 paying tenants at Starter plan (₹4,999 × 5 = ₹24,995 ≈ $300).

### Phase 2 — Growing (50–500 tenants, 2 regions)

| Service | Monthly cost |
|---|---|
| Control Plane RDS Aurora (Multi-AZ) | ~$130 |
| 3–4 shared pods (ap-south-1 + us-east-1) | ~$300 |
| 2–3 dedicated pods (large enterprises) | ~$400 |
| ECS Fargate (auto-scaling, 4–8 tasks) | ~$250 |
| Redis (2 regions) | ~$80 |
| ALB (2 regions) | ~$50 |
| CloudFront (1 TB transfer) | ~$85 |
| S3 (5 TB storage) | ~$120 |
| SES (100K emails) | ~$10 |
| WAF + Shield Advanced | ~$100 |
| **Total** | **~$1,525/month** |

Break-even: ~30 paying tenants at Starter plan, or 10 at Growth.

### Phase 3 — Scale (500+ tenants, 4 regions)
Estimated $5,000–$10,000/month — but at this point ARR is $1M+ so AWS is not the constraint.

**Cost optimisation levers:**
- RDS reserved instances (1-year): ~40% savings on DB
- S3 Intelligent Tiering: auto-moves old files to cheaper storage class
- ECS Spot for non-prod workloads
- CloudFront caching: reduces S3 GET costs significantly

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
