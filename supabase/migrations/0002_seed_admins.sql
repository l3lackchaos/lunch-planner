-- 0002_seed_admins.sql — bootstrapping the first admin(s).
--
-- There is no static admin seed here on purpose: Members are created/claimed at
-- LINE login time (ADR-0008), so we cannot know users.id ahead of time. Instead,
-- the login server route (Next.js, ADR-0002) holds an ADMIN_LINE_USER_IDS env
-- list. When it upserts a Member whose LINE userId is in that list, it sets
-- role = 'admin' (idempotently). This SQL helper does the same role flip and is
-- handy for manual promotion / re-running.
--
-- Usage (from the login route after upsert, or by hand):
--   select promote_admin('Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

create or replace function promote_admin(p_line_user_id text)
  returns users
  language sql
  volatile
  security definer
  set search_path = public
as $$
  update users
     set role = 'admin'
   where line_user_id = p_line_user_id
  returning *;
$$;

comment on function promote_admin(text) is
  'Sets role=admin for the user with the given LINE userId. App calls this (or sets role on upsert) for every id in ADMIN_LINE_USER_IDS at login (ADR-0008/0002). Returns the updated row, or no rows if the LINE userId is not yet in the roster.';
