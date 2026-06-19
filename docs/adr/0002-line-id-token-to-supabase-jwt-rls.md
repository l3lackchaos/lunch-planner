# Verify LINE ID token server-side, mint a Supabase JWT for RLS

The client (LIFF) sends its LINE ID token to a Next.js server route, which verifies it with
LINE, upserts the Member, and mints a Supabase-compatible JWT (sub = users.id) so Postgres
Row Level Security enforces per-Member access. We deliberately reject the simpler alternative
of holding the Supabase service-role key on the server and bypassing RLS, because that pushes
all authorization into hand-written code and risks data leaks. The trade-off is extra JWT
plumbing in exchange for defense-in-depth at the database layer.
