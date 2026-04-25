# CLAUDE.md — auth-web-agent

Own ONLY `app/(auth)/`. Do not touch any other directory.

## Routes to build
```
/login              → email+password form + Google OAuth button
/register           → individual signup OR enterprise signup (toggle)
/forgot-password    → email input → sends reset link
/reset-password     → new password form (reads ?token= from URL)
/onboarding         → post-signup: individual profile setup OR org creation flow
```

## API endpoints to call
Read `../../../contracts/openapi.yaml` paths tagged `auth`.

| Action | Endpoint |
|---|---|
| Form login | `POST /api/auth/login` |
| Form register | `POST /api/auth/register` |
| Google OAuth | `GET /api/auth/google` (redirects to Google) |
| Forgot password | `POST /api/auth/forgot-password` |
| Reset password | `POST /api/auth/reset-password` |
| Refresh token | `POST /api/auth/refresh` (handled by lib/api.ts interceptor — do not call directly) |

## Key business rules

### Register form
Two modes on same page — toggle with "Individual" / "Enterprise" tab:
- **Individual**: name, email, password, confirm password
- **Enterprise**: org name, org slug (auto-generated from org name, editable), admin name, email, password, region selector (India / US / Europe / Middle East)

### After login/register
1. Store `access_token` in Zustand auth store (memory only — never localStorage)
2. `refresh_token` is set as httpOnly cookie by backend — no JS action needed
3. Redirect to `/onboarding` if profile incomplete, else `/dashboard`

### Google OAuth flow
- Button click → navigate to `GET /api/auth/google`
- Backend handles OAuth dance → redirects back to `/auth/callback?token=...`
- `app/(auth)/callback/page.tsx` extracts token from URL → stores in Zustand → redirects to dashboard
- Individual-only for Phase 1 (enterprise always uses form)

### Onboarding
- Individual: display name, avatar upload (optional), timezone
- Enterprise: org logo upload, confirm region, first team invite (optional skip)

## Design rules — follow EXACTLY
Read `../../CLAUDE.md` (web control agent) for the full design system.

Key requirements for auth pages:
- Full-page centered layout: `min-h-screen flex items-center justify-center bg-zinc-50`
- Card container: `bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-md`
- Logo at top of card: text "DocPanther" in `font-extrabold text-zinc-900` with `text-orange-500` accent
- Primary CTA: orange-500 button, full width
- Error messages: `text-red-600 text-sm` below the relevant input
- Google OAuth button: white background, zinc-200 border, Google logo icon on left

## Do NOT
- Add navigation/sidebar — auth pages are standalone
- Call any endpoint not listed above
- Touch `lib/api.ts` or `lib/auth.ts`
