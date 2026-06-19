# CLAUDE.md — Lunch Planner

LINE LIFF app for office lunch ordering, egg selection, and weekly (pre-paid) payment,
with manual admin slip confirmation. **Read `CONTEXT.md` for domain language** and
`docs/adr/` for locked decisions before changing behaviour.

## Stack
Next.js 15 (App Router, TS, `src/`) · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage)
· LINE LIFF · deploy on Vercel. Package manager: **pnpm**.

## Commands
- `pnpm dev` — dev server
- `pnpm build` — production build (also typechecks)
- `pnpm lint` — eslint
- `pnpm typecheck` — `tsc --noEmit`

## Conventions
- Import alias `@/*` → `src/*`.
- Mobile-first; the app runs inside the LINE in-app browser. Prefer Server Components;
  minimise client JS.
- Design tokens live in `src/app/globals.css` (`@theme`): `ink, paper, yolk, leaf, chili,
  line-brand, muted, card, border`. Use Tailwind utilities (`bg-paper`, `text-ink`, …).
  Don't hardcode hex in components.
- Never commit secrets. Env vars are documented in `.env.example`.
- Thai is the primary UI language; technical terms stay English.

## Key rules (see ADRs)
- Verify LINE ID token server-side, mint a Supabase JWT for RLS (ADR-0002).
- Manual slip confirmation; no bank API (ADR-0003).
- Menus keyed by `menu_date` (ADR-0004). Two distinct "no" states: ไม่กิน = no order item,
  ไม่ทานไข่ = egg `none` (ADR-0005). No LLM/AI (ADR-0006).
- Pre-pay: order deadline = Thursday **before** the consumption week (ADR-0007).
- Admin pre-creates roster; LINE account claimed on first login (ADR-0008).
- Payments append-only; latest = current (ADR-0009). Lock order when payment confirmed (ADR-0010).
