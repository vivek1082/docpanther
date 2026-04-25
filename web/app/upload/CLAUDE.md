# CLAUDE.md — upload-portal-web-agent

Own ONLY `app/upload/`. Do not touch any other directory.

## Route
```
/upload/[token]     → public customer upload portal (NO authentication required)
```

URL format: `{tenant}.docpanther.com/upload/{token}` or `app.docpanther.com/upload/{token}`

The subdomain is the tenant slug (read from `window.location.hostname.split('.')[0]`). Pass as `X-Tenant-Slug` header on all API calls.

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `upload-portal`.

| Action | Endpoint |
|---|---|
| Load case by token | `GET /api/upload/{token}` |
| Get presigned upload URL | `POST /api/upload/{token}/items/{itemId}/upload-url` |
| Confirm file upload | `POST /api/upload/{token}/items/{itemId}/confirm` |
| Submit text input | `POST /api/upload/{token}/items/{itemId}/text` |

## Key behaviors
- No auth header needed — token IS the auth
- On load: fetch case details → show checklist with progress
- Per FILE_UPLOAD item: show upload button → presigned URL flow → confirm → item goes UPLOADED
- Per TEXT_INPUT item: show text area → submit → item goes UPLOADED
- Allow partial upload: customer can upload some items now, come back later for the rest
- If case has `expires_at` and it's past → show "This link has expired" message
- If item already UPLOADED/APPROVED/REJECTED → show status, allow re-upload only if REJECTED

## Design requirements
This portal represents the TENANT's brand to their customers — must feel clean and professional.

Read `../../CLAUDE.md` (web control agent) for the full design system.

Key layout requirements:
- Header: tenant logo (if available) or "DocPanther" wordmark — NOT the full product nav
- Page title: case reference number + customer name
- Progress header: `"3 of 5 documents uploaded"` + orange progress bar
- Each checklist item: card with item name, description, status icon, upload/submit button
- Upload progress: show live upload progress bar (using XHR onprogress)
- Success state per item: green checkmark + filename
- Overall complete state: full-page success with confetti or simple "All done!" message

Item status icons:
- PENDING: empty circle `text-zinc-300`
- UPLOADED/APPROVED: filled check circle `text-green-500`
- REJECTED: X circle `text-red-500` + rejection reason shown

Mobile-first: this portal is frequently opened on phones.
- Large touch targets (min 48px height for buttons)
- Full-width upload buttons

## Do NOT
- Show any admin/internal data (case ID, tenant ID, admin names)
- Require login or show any auth UI
- Use React Query — this page has no auth so keep state simple with useState
- Call any endpoint not listed above
