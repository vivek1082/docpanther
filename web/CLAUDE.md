# CLAUDE.md — Web Control Agent (Next.js Frontend)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS v4
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

## Multi-Agent Architecture

Web is split into independent sub-agents by route area. Each agent owns its directory only.

| Agent | Directory | Owns |
|---|---|---|
| auth-web-agent | `app/(auth)/` | Login, register, forgot/reset password, onboarding |
| dashboard-web-agent | `app/(app)/dashboard/`, `app/(app)/folder/` | File explorer, folder tree |
| cases-web-agent | `app/(app)/cases/` | Case list, case detail, checklist, templates |
| education-web-agent | `app/(app)/education/` | Batches, subjects, materials, student portal |
| settings-web-agent | `app/(app)/settings/`, `app/(app)/notifications/` | Org settings, billing, notifications |
| upload-portal-web-agent | `app/upload/` | Public customer upload portal (no auth) |
| shared-web-agent | `app/shared/` | Shared document viewer |

### What the web control agent owns (do NOT modify in sub-agents)
- `app/layout.tsx` — root layout with font and global providers
- `app/globals.css` — global styles + CSS variables
- `lib/api.ts` — Axios instance, interceptors, token refresh logic
- `lib/auth.ts` — token store (memory), auth state
- `store/` — Zustand stores
- `components/ui/` — shared UI primitives (Button, Input, Card, Badge, Modal, etc.)
- `tailwind.config.ts` — theme tokens
- `package.json` — dependencies (sub-agents must not add packages)

### What sub-agents MUST NOT do
- Modify `lib/api.ts` or `lib/auth.ts`
- Add global styles to `globals.css`
- Create new components in `components/ui/` — only use existing primitives
- Import from another route's directory
- Make API calls not in `../../contracts/openapi.yaml`
- Store `access_token` in localStorage (XSS risk — keep in memory only)

---

## Design System — MUST follow in all agents

### Font
```tsx
// Defined in app/layout.tsx — already applied globally
import { Geist } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Use font-sans class — maps to Geist via CSS variable
```

### Color palette (Tailwind classes)
| Role | Class | Hex |
|---|---|---|
| Brand primary | `bg-orange-500` / `text-orange-500` | #f97316 |
| Brand hover | `bg-orange-600` | #ea6c0a |
| Brand light bg | `bg-orange-50` | #fff7ed |
| Brand border | `border-orange-200` | #fed7aa |
| Background | `bg-white` | #ffffff |
| Surface/card bg | `bg-zinc-50` | #fafafa |
| Heading | `text-zinc-900` | #09090b |
| Body | `text-zinc-700` | #3f3f46 |
| Muted | `text-zinc-500` | #71717a |
| Placeholder | `text-zinc-400` | #a1a1aa |
| Divider/border | `border-zinc-100` | #f4f4f5 |
| Input border | `border-zinc-200` | #e4e4e7 |
| Success | `text-green-600` / `bg-green-100` | #16a34a |
| Error | `text-red-600` / `bg-red-50` | #dc2626 |

### Component patterns
```tsx
// Primary button
<button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">

// Secondary/outline button
<button className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors">

// Card
<div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">

// Input
<input className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500">

// Badge (status)
<span className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">

// Page heading
<h1 className="text-2xl font-extrabold text-zinc-900">
```

---

## Auth
- `access_token` — stored in memory only (Zustand store, never localStorage)
- `refresh_token` — stored in `httpOnly` cookie
- Axios interceptor in `lib/api.ts`: on 401 → call `POST /api/auth/refresh` → retry
- On logout: `POST /api/auth/logout` → clear Zustand store

## Tenant routing
- Detect subdomain: `window.location.hostname.split('.')[0]`
- `app` subdomain → individual/tenant dashboard
- `{slug}` subdomain → tenant-branded portal (pass as `X-Tenant-Slug` header)

## API contract
All API calls must match `../contracts/openapi.yaml`. Types come from `../contracts/models.md`.

## Do NOT
- Make API calls not in `../contracts/openapi.yaml`
- Store access_token in localStorage
- Import from `../backend/`
- Add analytics/tracking without user consent UI (DPDP compliance)
- Hardcode API base URL — read from `NEXT_PUBLIC_API_URL` env var
