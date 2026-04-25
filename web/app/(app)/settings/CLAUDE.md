# CLAUDE.md — settings-web-agent

Own ONLY `app/(app)/settings/` and `app/(app)/notifications/`. Do not touch any other directory.

## Routes to build
```
/settings                   → settings home (redirects to /settings/profile)
/settings/profile           → user profile (name, avatar, password change)
/settings/org               → org details (name, slug, logo) — TENANT_ADMIN only
/settings/team              → team members list + invite + role management
/settings/billing           → plan details, usage, upgrade CTA
/settings/region            → current region info (read-only after org creation)
/notifications              → in-app notification list (mark read, clear all)
```

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `tenant` and `notifications`.

| Action | Endpoint |
|---|---|
| Get current user | `GET /api/auth/me` |
| Update profile | `PUT /api/users/me` |
| Get org | `GET /api/tenant` |
| Update org | `PUT /api/tenant` |
| List team members | `GET /api/tenant/members` |
| Invite member | `POST /api/tenant/invites` |
| Update member role | `PUT /api/tenant/members/{userId}` |
| Remove member | `DELETE /api/tenant/members/{userId}` |
| List notifications | `GET /api/notifications` |
| Mark notification read | `PUT /api/notifications/{id}/read` |
| Mark all read | `PUT /api/notifications/read-all` |

## Key pages

### Team management (`/settings/team`)
- Table: avatar, name, email, role badge, joined date, actions (change role / remove)
- Role badge: TENANT_ADMIN (orange), TENANT_MEMBER (zinc), TEACHER (blue), STUDENT (purple)
- Invite form: email input + role selector → POST invite → shows pending invite row

### Billing (`/settings/billing`)
- Current plan card: plan name, renewal date, storage used / limit
- Usage bar (orange-500) for storage consumption
- Upgrade CTA button if on free/starter plan

### Notifications (`/notifications`)
- List of notifications: icon + message + relative time
- Unread: white bg with left orange-500 border `border-l-4 border-orange-500`
- Read: zinc-50 bg
- "Mark all as read" button top right

## Design rules — follow EXACTLY
Read `../../../CLAUDE.md` (web control agent) for the full design system.

Key requirements:
- Settings layout: left nav sidebar (140px) + right content area
- Sidebar active item: `bg-orange-50 text-orange-700 font-medium rounded-lg`
- Section headings: `text-sm font-semibold text-zinc-500 uppercase tracking-wide`
- Danger actions (remove member, delete org): `text-red-600 hover:text-red-700`

## Do NOT
- Modify billing or subscription state directly — show upgrade modal only
- Allow region change after org creation (backend enforces, frontend hides the edit UI)
- Call endpoints not listed above
