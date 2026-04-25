# CLAUDE.md — education-agent

## Scope
Own ONLY `com.docpanther.education.*`. Do not touch any other package.

## What to build
Full education vertical: batch templates, batches, subjects, teacher assignment, material upload/approval, student portal, student personal storage.

## Package layout
```
education/
├── controller/
│   ├── BatchTemplateController.java   → /api/edu/templates/**
│   ├── BatchController.java           → /api/edu/batches/**
│   ├── SubjectController.java         → /api/edu/subjects/**
│   ├── MaterialController.java        → /api/edu/materials/**
│   └── StudentPortalController.java   → /api/edu/my/**
├── service/
│   ├── BatchTemplateService.java
│   ├── BatchService.java
│   ├── SubjectService.java
│   ├── MaterialService.java
│   └── StudentStorageService.java
├── model/
│   ├── BatchTemplate.java
│   ├── BatchTemplateSubject.java
│   ├── Batch.java
│   ├── BatchSubject.java
│   ├── SubjectTeacher.java
│   ├── BatchEnrollment.java
│   ├── Material.java
│   ├── MaterialStatus.java        (enum: PENDING_REVIEW, APPROVED, REJECTED)
│   └── StudentStorage.java
└── repository/
    ├── BatchTemplateRepository.java
    ├── BatchRepository.java
    ├── BatchSubjectRepository.java
    ├── MaterialRepository.java
    ├── BatchEnrollmentRepository.java
    └── StudentStorageRepository.java
```

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `education`.
Read `../../../../../../../../../../PLAN.md` Module 11 for full business rules.

## Controller skeletons already created
`controller/` directory has skeleton controllers with endpoint mappings.
Fill in service calls — do NOT add business logic in controllers.

## Key business rules to implement

### Batch from template
When `POST /api/edu/batches` includes `templateId`:
1. Load template subjects from `batch_template_subjects`
2. Create one `batch_subjects` row per template subject
3. For each subject with `default_teacher_id` → check teacher still exists in tenant → create `subject_teachers` row

### Material approval flow
On `PUT /api/edu/materials/{id}/approve`:
1. Set `status = APPROVED`, `approved_by`, `approved_at`
2. Fetch all students enrolled in this material's batch (`batch_enrollments`)
3. Call `Mailer.sendMaterialNotification(studentEmails, material)` — async, do NOT block the response
4. Log `MATERIAL_APPROVED` to AuditLogger

### Student storage quota
Before issuing presigned URL for student upload:
1. Load `student_storage` row for this user + tenant
2. Check `used_bytes + requestedSizeBytes <= quota_bytes` → 429 if exceeded
3. After confirm-upload: `UPDATE student_storage SET used_bytes = used_bytes + sizeBytes`
4. After file delete: `UPDATE student_storage SET used_bytes = used_bytes - sizeBytes`

### Student visibility rules (enforce in every query)
- `GET /api/edu/my/batches` → only batches where `batch_enrollments.student_id = currentUserId`
- Materials → only `status = APPROVED`
- Personal folder → only files where `uploaded_by = currentUserId`
- NEVER return PENDING_REVIEW or REJECTED materials to STUDENT role

### Dual mode (education + case)
Cases can have `batch_id` set. When listing batch detail, include open cases for that batch.
Do NOT implement case logic here — call `CaseService` interface from `common/` to get batch cases.

## Role checks
```java
// Teaching endpoints — require TEACHER or TENANT_ADMIN
@PreAuthorize("hasAnyRole('TEACHER','TENANT_ADMIN')")

// Admin-only endpoints (approve/reject, batch management)
@PreAuthorize("hasRole('TENANT_ADMIN')")

// Student endpoints
@PreAuthorize("hasRole('STUDENT')")
```

## Do NOT
- Write Flyway migrations — propose schema to control agent
- Send emails directly — call `Mailer` interface from `common/`
- Access S3 directly — call `FileStorage` interface from `common/`
- Modify cases module for batch_id — propose the `ALTER TABLE cases ADD COLUMN batch_id` migration to control agent

## Dependencies allowed
- `common/FileStorage` — presigned URLs for material upload + student folder upload
- `common/Mailer` — email blast on material approval, student invite
- `common.audit.AuditLogger (`import com.docpanther.common.audit.AuditLogger`)` — log MATERIAL_UPLOADED, MATERIAL_APPROVED, MATERIAL_REJECTED, STUDENT_ENROLLED, BATCH_CREATED
