# Phase 5 — Review (T5.5) & QA notes

## Security review — PASS

| Area | Finding |
|------|---------|
| Secret isolation | No `"use client"` module imports `lib/supabase/admin`, `lib/auth/jwt`, `lib/line/notify`, `serverEnv`, or the service-role/JWT secrets — verified by grep. Secrets stay server-side. |
| Identity | LINE ID token is verified server-side (aud/exp) before any session is minted (ADR-0002). |
| Session | JWT is HS256-signed with `SUPABASE_JWT_SECRET`; stored in an httpOnly, `secure` (prod), `sameSite=lax` cookie. |
| Authorization (defense-in-depth) | (1) route-group guards (`requireAdmin`/`requireCookOrAdmin`), (2) every server action re-checks auth + ownership + state, (3) Postgres **RLS** is the final backstop on every table. |
| Input validation | All `actions.ts` (incl. voting) validate inputs with `zod`; admin actions `requireAdmin`, member votes `getCurrentUser` + RLS (own vote, round open). |
| Business rules enforced at multiple layers | Order edit-lock when payment confirmed (UI + action + `order_is_editable()` RLS), append-only payments, holidays not orderable, two "no" states. |
| Storage | Slips live in a private bucket; access is path-scoped to `auth.uid()` + admins; images served via 60s signed URLs only. |
| Payment confirm/reject | Re-resolves the latest payment server-side (never trusts a client id); only flips a still-`pending` row (optimistic guard). |

## Performance — OK

- RSC-first; client JS only where interactive. First-load JS ≈ 102–125 kB per route.
- `next/image` with `remotePatterns` for LINE avatars + Supabase Storage.
- Summary views are small (one office group / one week); the order-grid cross join is bounded.
- Mobile-first; `maximumScale=1` and safe-area padding for the LINE webview.

## QA status

- ✅ `pnpm typecheck`, `pnpm build`, `pnpm lint` — green.
- ✅ `pnpm test` — 7 unit tests (deadline / weekDates / egg labels / amount) pass.
- ✅ `/preview` renders the full UI kit via SSR (verified content + zero errors).

## T5.2 site-audit — deferred to a deployed URL

`site-audit` (Lighthouse/axe via Playwright) needs a running browser + a reachable URL.
The sandbox can't provision a browser binary, and the authed pages need a live Supabase +
LINE session. **Run after the first Vercel preview deploy:**

```
/site-audit <preview-url>/preview      # UI kit (no auth needed)
/site-audit <preview-url>              # full flow, in the LINE in-app browser
```

Accessibility was built in (≥44px targets, ARIA roles, never color-only, focus rings,
system font scaling) — the audit is to confirm, not to discover.
