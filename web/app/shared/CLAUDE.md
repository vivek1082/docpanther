# CLAUDE.md — shared-web-agent

Own ONLY `app/shared/`. Do not touch any other directory.

## Route
```
/shared/[token]     → shared document viewer (no auth required; may require password)
```

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `sharing`.

| Action | Endpoint |
|---|---|
| Access share link | `POST /api/sharing/links/{token}/access` (body: `{ password? }`) |
| Track view | fired automatically on successful access |

Response on success: `{ presignedUrl, filename, contentType, expiresAt }`

## Key behaviors
1. On load → `POST /api/sharing/links/{token}/access` with empty body
2. If `401` → show password form → re-submit with entered password
3. If `403` → "This link has expired" or "Max views reached" — show appropriate message
4. If `404` → "Link not found"
5. On success → render document viewer based on contentType:
   - PDF: `<iframe>` or PDF.js embed
   - Image (jpg/png/gif/webp): `<img>` tag
   - Other: show filename + download button with the presigned URL

## Design rules — follow EXACTLY
Read `../../CLAUDE.md` (web control agent) for the full design system.

Key requirements:
- Password gate: centered card `max-w-sm` — same style as auth pages
  - Lock icon (Lucide `Lock`) in orange-500 at top
  - "Enter password to view this document"
  - Password input + "View Document" orange button
- Document viewer: `min-h-screen bg-zinc-50`
  - Top bar: filename, "DocPanther" branding on right, download button
  - Top bar: `bg-white border-b border-zinc-100 px-6 py-4`
  - Document area: centered, max-w-4xl, shadow-sm
- Error states: centered card with appropriate icon + message + "Go to DocPanther" link

## Do NOT
- Show any other UI elements (nav, sidebar) — this is a standalone viewer
- Cache the presigned URL (they expire) — fetch fresh on each page load
- Call any endpoint not listed above
