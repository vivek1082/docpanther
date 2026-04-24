# CLAUDE.md — checklist-agent

## Scope
Own ONLY `com.docpanther.checklist.*`. Do not touch any other package.

## What to build
- Checklist item CRUD on a case (add, update status, delete)
- Item types: FILE_UPLOAD and TEXT_INPUT
- Item status flow: PENDING → UPLOADED → APPROVED / REJECTED → PENDING
- Templates (create, update, delete, get)
- Apply template to case (copy items as independent snapshot)
- File type + size validation per item (overrides case-level defaults)
- After any item status change → call `CaseService.recalculateStatus(caseId)`

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `checklist`.
ChecklistItem and Template shapes in `contracts/models.md`.

## Key classes to create
- `ChecklistController` — REST at `/api/cases/{id}/items/**`
- `TemplateController` — REST at `/api/templates/**`
- `ChecklistService` — item CRUD, status transitions, validation
- `TemplateService` — template CRUD, apply-to-case (deep copy)
- `ChecklistItem` entity → `checklist_items` table
- `Template` entity → `templates` table
- `TemplateItem` entity → `template_items` table

## Validation rules for FILE_UPLOAD items
Check in order before generating presigned URL:
1. `item.allowedFileTypes` not empty → mimeType must match
2. Else fall back to `case.allowedFileTypes`
3. `item.maxFileSizeMb` not null → sizeBytes ≤ item limit
4. Else fall back to `case.maxFileSizeMb`
5. If item.status = APPROVED → reject re-upload (409 Conflict)

## Do NOT
- Write Flyway migrations — propose to control agent
- Generate presigned URLs — that is storage-agent's job; this agent only validates
- Call S3 — call `FileStorage` interface if needed

## Dependencies allowed
- `cases/CaseService` interface method `recalculateStatus(UUID caseId)` — call after every item status change
- `audit/AuditLogger` — log CHECKLIST_FILE_APPROVED, CHECKLIST_FILE_REJECTED, TEXT_SUBMITTED
