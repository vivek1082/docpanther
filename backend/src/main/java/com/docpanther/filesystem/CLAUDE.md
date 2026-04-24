# CLAUDE.md — filesystem-agent

## Scope
Own ONLY `com.docpanther.filesystem.*`. Do not touch any other package.

## What to build
- Folders CRUD (create, rename, delete recursive, move)
- Folder permissions (grant VIEW/EDIT to user, revoke)
- Direct file upload to a folder (presigned URL flow)
- File node rename, delete, move
- Full-text search across folders/cases/files (PostgreSQL `ILIKE` or `ts_vector`)
- Root contents listing

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `filesystem`.
Response shapes for Folder and FileNode are in `contracts/models.md`.

## Key classes to create
- `FileSystemController` — REST endpoints at `/api/fs/**`
- `FolderService` — folder CRUD, permission checks
- `FileNodeService` — direct upload, rename, delete, move
- `FileSystemSearchService` — search across folders + cases + file_nodes
- `Folder` entity → `folders` table
- `FolderPermission` entity → `folder_permissions` table
- `FileNode` entity → `file_nodes` table

## Permission enforcement
Before any operation, check: does the current user have the required permission on this folder?
- Check `folder_permissions` table — user's direct permission
- If no direct permission, walk up the parent chain (permission inheritance)
- OWNER > EDIT > VIEW
- TENANT_ADMIN has implicit OWNER on all folders within their tenant

## Do NOT
- Interact with S3 directly — call `FileStorage` interface from `common/`
- Write Flyway migrations — propose to control agent
- Access case data — the search result for cases returns only `id, referenceNo, customerName` from a cross-module query (use a native SQL join or a `CaseSummaryProjection`)

## Dependencies allowed
- `common/FileStorage` interface (for presigned URL generation and file deletion)
- `audit/AuditLogger` — log FOLDER_CREATED, FILE_UPLOADED, PERMISSION_GRANTED etc.
