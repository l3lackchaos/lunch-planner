# Use Next.js + Supabase + Vercel for a LINE LIFF app

We build the app as a Next.js (App Router) project deployed on Vercel, with Supabase
(Postgres + Auth + Storage) as the backend, surfaced inside LINE via LIFF. Chosen because
the team's environment already provisions Supabase/Vercel/LINE, giving the fastest path to a
mobile-first in-LINE web app. Lock-in is accepted: swapping the database/auth provider or the
host would be a multi-week effort, so this is recorded deliberately.
