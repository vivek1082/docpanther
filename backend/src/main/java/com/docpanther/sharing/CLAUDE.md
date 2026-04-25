# CLAUDE.md — sharing-agent

## Scope
Own ONLY `com.docpanther.sharing.*`. Do not touch any other package.

## What to build
- Create share link for a document (optional password, expiry, max views)
- List share links for a case
- Revoke share link
- Public access endpoint: validate token, check expiry/views, validate password, return presigned S3 GET URL
- View count increment on each valid access
- Password hash storage (bcrypt via Spring Security's `BCryptPasswordEncoder`)

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `sharing`.

## Key classes to create
- `ShareController` — `/api/documents/{docId}/share`, `/api/cases/{id}/share-links`, `/api/share-links/{id}`
- `SharedAccessController` — `/api/shared/{token}` (public, no auth)
- `ShareService` — create, revoke, access validation
- `ShareLink` entity → `share_links` table

## Access flow
```
GET /api/shared/{token}
  → find ShareLink by token
  → check expiresAt (410 if expired)
  → check viewCount < maxViews if maxViews set (410 if exceeded)
  → return: { isPasswordProtected, expiresAt, filename }

POST /api/shared/{token}/access  { password? }
  → validate password if isPasswordProtected (401 if wrong)
  → increment view_count
  → generate short-lived presigned S3 GET URL (5 min)
  → return: { downloadUrl, expiresAt }
```

## Do NOT
- Access S3 directly — call `FileStorage` interface from `common/`
- Write Flyway migrations — propose to control agent

## Dependencies allowed
- `common/FileStorage` — for generating presigned GET URL
- `common.audit.AuditLogger (`import com.docpanther.common.audit.AuditLogger`)` — log LINK_SHARED, LINK_VIEWED, LINK_PASSWORD_FAILED
