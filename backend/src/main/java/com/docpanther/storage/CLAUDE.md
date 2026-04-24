# CLAUDE.md — storage-agent

## Scope
Own ONLY `com.docpanther.storage.*`. Do not touch any other package.

## What to build
- S3 presigned PUT URL generation (admin side: case item upload)
- S3 presigned PUT URL generation (public side: customer upload portal)
- Confirm upload → save Document record
- Document delete (S3 object + DB record)
- `FileStorage` interface (in `common/`) — implementation lives here
- Public upload portal endpoints (no auth, token-based)

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml`:
- Paths tagged `storage` — admin upload endpoints
- Paths tagged `upload-portal` — public customer endpoints

## Key classes to create
- `StorageController` — `/api/cases/{id}/items/{itemId}/upload-url` and `/confirm-upload`
- `UploadPortalController` — `/api/upload/{token}/**` (public, no auth)
- `StorageService` — presigned URL generation, confirm upload, delete
- `S3FileStorage` implements `FileStorage` (interface in common/)
- `Document` entity → `documents` table

## Presigned URL generation
```java
// Always embed content-length-range condition so S3 enforces size limit
PutObjectPresignRequest.builder()
  .putObjectRequest(r -> r
    .bucket(bucket)
    .key(s3Key)
    .contentType(mimeType)
  )
  .signatureDuration(Duration.ofMinutes(15))
  .build()
```
Add `content-length-range` condition via `PresignedPutObjectRequest` conditions.

## Public endpoint: resolve tenant from Host header
```java
// Extract slug from Host: hdfc.docpanther.com → "hdfc"
String slug = request.getServerName().split("\\.")[0];
// Lookup tenant by slug in control plane DB
```

## Validation before issuing presigned URL (public portal)
1. Lookup case by upload token — 404 if not found
2. Check `case.expiresAt` — 410 if expired
3. Validate filename mimeType against item/case `allowedFileTypes`
4. Validate sizeBytes against item/case `maxFileSizeMb`
5. Check item is not already APPROVED — 409 if so

## Do NOT
- Write Flyway migrations — propose to control agent
- Handle checklist item status changes — after confirm-upload, call `ChecklistService.markUploaded(itemId)` via interface
- Send emails — call `Mailer` interface

## Dependencies allowed
- `common/FileStorage` interface (you implement this)
- `checklist/ChecklistService` → `markUploaded(itemId)` method
- `audit/AuditLogger` — log FILE_UPLOADED
