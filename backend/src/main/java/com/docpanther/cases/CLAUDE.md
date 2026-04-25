# CLAUDE.md — cases-agent

## Scope
Own ONLY `com.docpanther.cases.*`. Do not touch any other package.

## What to build
- Case CRUD (create, read, update, delete, move between folders)
- Upload token generation (10-char nanoid, unique)
- Case status derivation from checklist item statuses (PENDING/PARTIAL/COMPLETE)
- Reminder trigger (calls Mailer — does not send email directly)
- ZIP download (streams all case documents from S3 as a zip)
- Audit log listing for a case

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `cases`.
Case response shape is in `contracts/models.md` — include `uploadUrl` built as `{tenantSlug}.docpanther.com/{uploadToken}`.

## Key classes to create
- `CaseController` — REST at `/api/cases/**`
- `CaseService` — CRUD, status recalculation, reminder, ZIP streaming
- `Case` entity → `cases` table
- `CaseRepository` (JpaRepository + custom queries for pagination/filtering)
- `TokenGenerator` — generates 10-char URL-safe random string using SecureRandom

## Status recalculation rule
```
if all required items = APPROVED → COMPLETE
else if any item = UPLOADED or APPROVED → PARTIAL
else → PENDING
```
Recalculate and persist after every checklist item status change.
Checklist module calls `CaseService.recalculateStatus(caseId)` after item updates.

## ZIP streaming
Use S3 SDK streaming + `ZipOutputStream` → write directly to `HttpServletResponse.getOutputStream()`.
Do NOT buffer entire ZIP in memory. Stream file-by-file.

## Do NOT
- Write Flyway migrations — propose to control agent
- Send emails directly — call `Mailer.sendReminder(case)` via interface
- Access checklist item data directly — checklist module handles that; cases module only reads document count via a DTO projection

## Dependencies allowed
- `common/FileStorage` (`import com.docpanther.common.storage.FileStorage`) — for ZIP download
- `common.audit.AuditLogger` (`import com.docpanther.common.audit.AuditLogger`) — log CASE_CREATED, CASE_UPDATED, CASE_DELETED, REMINDER_SENT
- `common/mail/Mailer` (`import com.docpanther.common.mail.Mailer`) — for reminder email; do NOT import from notifications package
- Implement `com.docpanther.common.cases.CaseService` interface in your CaseService — checklist agent will inject this via the common interface

## Existing skeleton files
- `model/Case.java` — already created with all fields; `createdBy` is UUID (not User reference)
- `model/CaseStatus.java` — already created with PENDING, PARTIAL, COMPLETE
- `model/StorageMode.java` — already created with FLAT, STRUCTURED
