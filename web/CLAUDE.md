# CLAUDE.md — web-agent (Next.js Frontend)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- React Query (server state)
- Zustand (client state)
- Axios (API calls)

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint check
```

## API contract
ALL API calls must match `../contracts/openapi.yaml`. Use the request/response types from `../contracts/models.md`.
Do NOT add fields to API calls that aren't in the contract — the backend will ignore or reject them.

## App structure
```
app/
├── (auth)/           → /login, /register, /forgot-password, /reset-password
├── (app)/            → authenticated routes (require JWT)
│   ├── dashboard/    → file explorer (root contents)
│   ├── folder/[id]/  → folder contents
│   ├── cases/        → case list
│   ├── cases/[id]/   → case detail + checklist management
│   ├── templates/    → template library
│   ├── notifications/→ in-app notifications
│   └── settings/     → org settings, team, billing
├── upload/[token]/   → public customer upload portal (NO auth required)
└── shared/[token]/   → shared document viewer (password gate)
```

## Auth
- Store `access_token` in memory (not localStorage — XSS risk)
- Store `refresh_token` in `httpOnly` cookie
- Axios interceptor: on 401, call `/api/auth/refresh`, retry original request
- On logout: POST `/api/auth/logout`, clear cookie

## Tenant routing
- Admin app: `app.docpanther.com` — reads subdomain `app`, treats as individual/tenant dashboard
- Customer upload portal: `hdfc.docpanther.com/upload/{token}` — reads subdomain `hdfc` as tenant slug, passes in API calls
- Detect subdomain: `window.location.hostname.split('.')[0]`

## Key pages to build (in order)
1. `/login` and `/register` (individual + enterprise form)
2. `/dashboard` — file explorer with folder tree, case list, file list
3. `/cases/[id]` — case detail, checklist, approve/reject items
4. `/upload/[token]` — customer upload portal (public)
5. `/templates` — template library
6. `/shared/[token]` — shared document viewer
7. `/settings` — org and billing settings

## Do NOT
- Make API calls that aren't in `../contracts/openapi.yaml`
- Store access_token in localStorage
- Import from `../backend/` — frontend and backend are separate
- Add analytics/tracking without user consent UI (DPDP compliance)
