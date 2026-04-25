# CLAUDE.md — education-web-agent

Own ONLY `app/(app)/education/`. Do not touch any other directory.

## Routes to build
```
/education                          → education home: my batches (student) or manage batches (admin/teacher)
/education/batches                  → batch list (TENANT_ADMIN)
/education/batches/new              → create batch (optionally from template)
/education/batches/[id]             → batch detail: subjects, materials, enrolled students
/education/subjects/[id]            → subject detail: materials list, teacher list
/education/materials/[id]           → material detail + approve/reject
/education/templates                → batch template library (TENANT_ADMIN)
/education/templates/new            → create batch template
/education/my                       → student portal: my batches + personal storage
/education/my/batches/[id]          → student batch view (approved materials only)
/education/my/storage               → personal 5GB storage manager
```

## Role-based rendering
- `TENANT_ADMIN` — sees full management UI (create/edit batches, assign teachers, approve materials)
- `TEACHER` — sees their assigned subjects, can upload materials for those subjects
- `STUDENT` — sees only `/education/my/**` routes; never sees PENDING_REVIEW or REJECTED materials

Read role from Zustand auth store: `useAuthStore(s => s.user.role)`

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `education`.

| Action | Endpoint | Role |
|---|---|---|
| List batches | `GET /api/edu/batches` | TENANT_ADMIN |
| Create batch | `POST /api/edu/batches` | TENANT_ADMIN |
| Batch detail | `GET /api/edu/batches/{id}` | TENANT_ADMIN |
| Enroll students | `POST /api/edu/batches/{id}/enroll` | TENANT_ADMIN |
| Add subject | `POST /api/edu/batches/{batchId}/subjects` | TENANT_ADMIN |
| Assign teacher | `POST /api/edu/subjects/{id}/teachers` | TENANT_ADMIN |
| List materials | `GET /api/edu/materials?subjectId={id}` | TEACHER\|ADMIN |
| Upload material | `POST /api/edu/materials` → PUT to S3 | TEACHER\|ADMIN |
| Approve material | `PUT /api/edu/materials/{id}/approve` | TENANT_ADMIN |
| Reject material | `PUT /api/edu/materials/{id}/reject` | TENANT_ADMIN |
| List templates | `GET /api/edu/templates` | TENANT_ADMIN |
| Create template | `POST /api/edu/templates` | TENANT_ADMIN |
| My batches | `GET /api/edu/my/batches` | STUDENT |
| My batch detail | `GET /api/edu/my/batches/{id}` | STUDENT |
| My storage | `GET /api/edu/my/storage` | STUDENT |
| Student upload URL | `POST /api/edu/my/storage/upload-url` | STUDENT |
| Confirm student upload | `POST /api/edu/my/storage/confirm` | STUDENT |
| My files | `GET /api/edu/my/storage/files` | STUDENT |
| Delete my file | `DELETE /api/edu/my/storage/files/{id}` | STUDENT |

## Key pages

### Batch detail (`/education/batches/[id]`)
Tabs: Subjects | Students | Cases (open cases linked to this batch via batch_id)
- Subjects tab: accordion list `IAS History ▸ 3 teachers · 12 materials`
- Students tab: enrolled student list with enroll/unenroll actions
- Cases tab: read-only list of open cases linked to batch (links to `/cases/[id]`)

### Material upload flow
1. Teacher clicks "Upload Material" → form: title, description, file picker
2. POST to `/api/edu/materials` → gets `{ materialId, presignedUrl }`
3. PUT file directly to presigned S3 URL
4. Status shows PENDING_REVIEW badge — waiting for admin approval

### Student portal (`/education/my`)
Sidebar navigation:
- My Batches
- My Storage (shows quota bar: X GB of 5 GB used)

Batch view: `IAS Batch 10 — 2025 > History > 3 approved materials`
Storage view: file manager grid, drag-to-upload, delete button per file

## Design rules — follow EXACTLY
Read `../../../CLAUDE.md` (web control agent) for the full design system.

Key requirements:
- Material status badges:
  - PENDING_REVIEW: `bg-zinc-100 text-zinc-600`
  - APPROVED: `bg-green-100 text-green-700`
  - REJECTED: `bg-red-100 text-red-600`
- Student quota bar: `bg-orange-500` fill, show `X.X GB of 5 GB used`
- Batch card: `bg-white rounded-2xl border border-zinc-100 shadow-sm`
- Subject accordion: left border `border-l-4 border-orange-200` when expanded

## Do NOT
- Show PENDING_REVIEW or REJECTED materials to STUDENT role
- Add case creation logic — link to `/cases/new?batchId={id}` for dual mode
- Call any case management endpoints — that's cases-web-agent
