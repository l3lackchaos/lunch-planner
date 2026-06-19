# Deploy & Run

The app needs three external pieces provisioned (none can be created from code alone):
**Supabase** (DB/Auth/Storage), a **LINE Login + LIFF** channel, and **Vercel** hosting.

## 1. Supabase
1. Create a project at supabase.com. Note the Project URL, anon key, service-role key,
   and the JWT secret (Settings → API → JWT Settings).
2. Link & push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applies supabase/migrations/*
   # optional demo data:
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
3. Confirm the private bucket `slips` exists (created by the migration) and RLS is on.

### 1b. Shared project (Bill4Shared) — `meal_planner` schema
This app is also deployed onto the existing **Bill4Shared** project under a dedicated
`meal_planner` schema (so it doesn't touch the public-schema apps). To reproduce:
```bash
psql "$DATABASE_URL" -f supabase/deploy/meal_planner.sql   # creates schema + exposes it
```
Then set **`NEXT_PUBLIC_DB_SCHEMA=meal_planner`** in the app env. (Local dev keeps the
default `public` via migrations 0001–0003.) The `meal_planner` schema is added to the Data
API exposed schemas by that script (`alter role authenticator set pgrst.db_schemas ...`);
if the API can't see it, also add `meal_planner` under Dashboard → Settings → API → Exposed schemas.

## 2. LINE
1. LINE Developers Console → create a **LINE Login** channel → note Channel ID + secret.
2. Add a **LIFF app** under it → size Full → endpoint URL = your deployment URL →
   scopes `profile openid`. Note the LIFF ID.
3. (Later / optional) a **Messaging API** channel for member push notifications (T5.4).

## 3. Env
Copy `.env.example` → `.env.local` (local) or set in Vercel → Project → Settings → Env:
`NEXT_PUBLIC_LIFF_ID`, `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET`, `ADMIN_LINE_USER_IDS` (comma-separated LINE userIds that become admins on login).

## 4. Run / deploy
```bash
pnpm install
pnpm dev            # http://localhost:3000  (open via the LIFF URL on a phone to test LINE login)
pnpm build && pnpm start
```

### Deploy to Vercel (Bill4Shared backend)
Env vars to set on the Vercel project (the first three are known; the rest are secret/your own):
```
NEXT_PUBLIC_SUPABASE_URL=https://ohbepgrcinhjdvweuwym.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Bill4Shared → Settings → API>
NEXT_PUBLIC_DB_SCHEMA=meal_planner
SUPABASE_SERVICE_ROLE_KEY=<service_role key — Settings → API>
SUPABASE_JWT_SECRET=<JWT secret — Settings → API → JWT Settings>
NEXT_PUBLIC_LIFF_ID=<from LINE LIFF app>
LINE_LOGIN_CHANNEL_ID=<LINE Login channel>
LINE_LOGIN_CHANNEL_SECRET=<LINE Login channel>
ADMIN_LINE_USER_IDS=<your LINE userId>
```
**Option A — Dashboard (simplest):** Vercel → Add New → Project → import `l3lackchaos/lunch-planner`
(branch `claude/gallant-ritchie-n9txt2`) → add the env vars above → Deploy. Pushes auto-deploy.

**Option B — CLI (needs a Vercel token):**
```bash
export VERCEL_TOKEN=...                       # vercel.com/account/tokens
npx vercel link --yes --token "$VERCEL_TOKEN"
# add each env var (repeat for production/preview), e.g.:
printf 'meal_planner' | npx vercel env add NEXT_PUBLIC_DB_SCHEMA production --token "$VERCEL_TOKEN"
# …add the rest…
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```
After deploying, set the LIFF endpoint URL to the production (and preview) URL.

## Notes
- LIFF login only works inside the LINE in-app browser (or the LIFF inspector). On a plain
  desktop browser the LINE handshake won't complete — use `/preview` to view the UI kit.
- Slips are private; images are served via short-lived signed URLs to the owner + admins.
- No bank/slip API and no LLM/AI are used (ADR-0003 / ADR-0006).

