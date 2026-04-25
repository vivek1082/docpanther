# CLAUDE.md — cases-web-agent

Own ONLY `app/(app)/cases/` and `app/(app)/templates/`. Do not touch any other directory.

## Routes to build
```
/cases                  → case list (filterable by status, search)
/cases/new              → create case wizard (3 steps)
/cases/[id]             → case detail + checklist management
/templates              → template library (list + create + edit)
```

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `cases` and `checklist`.

| Action | Endpoint |
|---|---|
| List cases | `GET /api/cases` |
| Create case | `POST /api/cases` |
| Get case | `GET /api/cases/{id}` |
| Update case | `PUT /api/cases/{id}` |
| Delete case | `DELETE /api/cases/{id}` |
| Get checklist | `GET /api/cases/{id}/checklist` |
| Approve item | `PUT /api/cases/{id}/items/{itemId}/approve` |
| Reject item | `PUT /api/cases/{id}/items/{itemId}/reject` |
| Get upload URL | `POST /api/cases/{id}/items/{itemId}/upload-url` |
| Confirm upload | `POST /api/cases/{id}/items/{itemId}/confirm-upload` |
| Send reminder | `POST /api/cases/{id}/remind` |
| List templates | `GET /api/templates` |
| Create template | `POST /api/templates` |
| Get template | `GET /api/templates/{id}` |
| Update template | `PUT /api/templates/{id}` |
| Delete template | `DELETE /api/templates/{id}` |

## Key pages

### Case list (`/cases`)
- Table/card list: reference_no, customer_name, status badge, progress bar, created_at
- Filter bar: status (pending/partial/complete), search by customer name/ref
- Status badge colors: pending=zinc, partial=orange-500, complete=green

### Create case wizard (`/cases/new`)
Step 1 — Case info: customer name, customer email, reference number, expiry date (optional), storage mode (flat/structured)
Step 2 — Checklist: pick template OR build from scratch (add FILE_UPLOAD or TEXT_INPUT items)
Step 3 — Share: show the generated upload link, copy button, send email button

### Case detail (`/cases/[id]`)
- Header: case reference, customer info, status badge, overall progress ring
- Checklist items: each item shows name, type, status, uploaded files (with preview icon)
- Per-item actions: Approve / Reject (with rejection note) for FILE_UPLOAD items
- Approved file: shows filename + "Share" button (calls sharing API)
- TEXT_INPUT items: show submitted text value inline
- Right panel: audit timeline (most recent events)

### Templates (`/templates`)
- Card grid of templates: name, item count, last used
- Click → template detail with item list (drag to reorder)
- "New Template" button → inline form

## Design rules — follow EXACTLY
Read `../../../CLAUDE.md` (web control agent) for the full design system.

Key requirements:
- Case status badges: use `rounded-full px-3 py-0.5 text-xs font-semibold`
  - pending: `bg-zinc-100 text-zinc-600`
  - partial: `bg-orange-50 text-orange-600 border border-orange-200`
  - complete: `bg-green-100 text-green-700`
- Progress bar: `bg-orange-500` fill on `bg-zinc-100` track, `h-1.5 rounded-full`
- Checklist item approved: `bg-green-50 border-green-200`
- Checklist item rejected: `bg-red-50 border-red-200`
- Upload link: monospace font, zinc-100 bg, copy icon button

## Do NOT
- Call sharing endpoints directly — use the Share button which calls `POST /api/sharing/links`
- Implement the public upload portal (that's `upload-portal-web-agent`)
- Add pagination to checklist items — checklists are always loaded fully
