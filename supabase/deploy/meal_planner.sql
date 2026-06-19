-- meal_planner.sql — Lunch Planner schema namespaced under the `meal_planner`
-- schema, generated from supabase/migrations/0001-0003 (search_path approach).
-- Applied to the shared Bill4Shared project so it lives alongside the existing
-- public-schema apps without touching them. Storage bucket name: 'slips'.

create schema if not exists meal_planner;
grant usage on schema meal_planner to anon, authenticated, service_role;
set search_path = meal_planner, public;

-- ===== from 0001_init.sql =====

-- 0001_init.sql — Lunch Planner schema (LINE LIFF office-lunch app)
-- Implements docs/03-data-model.md. ADR references are cited where a choice is non-obvious.
-- Auth model (ADR-0002): a minted Supabase JWT carries sub = users.id and role = 'authenticated';
-- therefore auth.uid() returns users.id directly (no separate auth.users mapping).

-- gen_random_uuid() lives in pgcrypto on older Postgres; ensure it is available.
create extension if not exists pgcrypto;

------------------------------------------------------------------------------
-- 1. Enums
------------------------------------------------------------------------------
create type user_role    as enum ('member', 'cook', 'admin');
create type week_status   as enum ('draft', 'open', 'closed', 'billed');
create type egg_style     as enum ('boiled', 'fried', 'omelette', 'none');
create type egg_doneness  as enum ('well', 'soft');          -- optional per item
create type pay_method    as enum ('slip', 'cash');
create type pay_status    as enum ('pending', 'confirmed', 'rejected');

------------------------------------------------------------------------------
-- 2. Tables
------------------------------------------------------------------------------

-- users — the Member roster (ADR-0008). line_user_id is NULL for admin-created
-- roster entries not yet claimed by a real LINE login.
create table users (
  id               uuid primary key default gen_random_uuid(),
  line_user_id     text unique,                    -- from LINE `sub`; NULL = unclaimed roster (ADR-0008)
  display_name     text not null,
  picture_url      text,
  role             user_role not null default 'member',
  is_active        boolean not null default true,  -- filter ex-members out of summaries
  created_by_admin boolean not null default false, -- true = pre-created roster (no LINE account yet)
  claimed_at       timestamptz,                    -- when the LINE account was first linked
  created_at       timestamptz not null default now()
);

-- week_plans — one weekly billing round (Mon–Fri).
create table week_plans (
  id             uuid primary key default gen_random_uuid(),
  week_start     date not null unique,             -- Monday of the consumption week
  status         week_status not null default 'draft',
  price_per_day  integer not null default 20,      -- THB / day
  -- order_deadline = the Thursday BEFORE week_start (orders are pre-paid, ADR-0007).
  -- Stored as a plain column; the app computes/validates it.
  order_deadline timestamptz,
  note           text,
  created_by     uuid references users(id),
  created_at     timestamptz not null default now()
);

-- menus — one dish per calendar date, keyed by menu_date and decoupled from
-- week_plans (ADR-0004). Holidays have no orders / no charge.
create table menus (
  id                  uuid primary key default gen_random_uuid(),
  menu_date           date not null unique,        -- logical PK; weekday = extract(isodow from menu_date)
  name                text,
  description         text,
  image_url           text,
  proposed_by_user_id uuid references users(id),   -- linked Member proposer
  proposed_by_name    text,                        -- free-text proposer (no account)
  is_holiday          boolean not null default false,
  created_at          timestamptz not null default now(),
  -- A non-holiday day must have a proposer one way or another.
  constraint menus_proposer_or_holiday_chk
    check (is_holiday or proposed_by_user_id is not null or proposed_by_name is not null)
);

-- orders — exactly one per Member per Week Plan.
create table orders (
  id           uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references week_plans(id) on delete cascade,
  user_id      uuid not null references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (week_plan_id, user_id)
);

-- order_items — one Member's choice for one day. Existence => eats that day.
create table order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  weekday   smallint not null check (weekday between 1 and 5),
  menu_date date not null,
  egg       egg_style not null default 'none',     -- boiled/fried/omelette/none(ไม่ทานไข่)
  doneness  egg_doneness,                           -- optional (e.g. fried + soft = ดาวไม่สุก)
  note      text,
  created_at timestamptz not null default now(),
  unique (order_id, weekday)                         -- one item per weekday
);

-- payments — append-only settlement rows (ADR-0009). NO unique(order_id):
-- a rejected slip + re-submit inserts a NEW row; current payment = latest by submitted_at.
create table payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,  -- intentionally NOT unique (ADR-0009)
  amount        integer not null,                   -- computed at submit time
  method        pay_method not null,
  slip_path     text,                               -- path in private bucket "slips" (method=slip only)
  status        pay_status not null default 'pending',
  submitted_at  timestamptz not null default now(),
  confirmed_by  uuid references users(id),          -- admin who actioned it
  confirmed_at  timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now()
);

------------------------------------------------------------------------------
-- 5. Indexes
------------------------------------------------------------------------------
-- orders(week_plan_id, user_id) already covered by the unique constraint above.
create index order_items_order_id_idx  on order_items (order_id);
create index order_items_menu_date_idx on order_items (menu_date);
create index payments_order_id_idx     on payments (order_id);
create index payments_status_idx       on payments (status);
-- menus are keyed by date (ADR-0004); the doc's daily_menus(week_plan_id,weekday)
-- index does not apply to this model, so index the actual lookup key instead.
create index menus_menu_date_idx       on menus (menu_date);

------------------------------------------------------------------------------
-- RLS helper functions
------------------------------------------------------------------------------
-- auth.uid() = users.id (ADR-0002). security definer so the helpers can read
-- users regardless of the caller's own RLS view; search_path pinned for safety.
create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = meal_planner, public as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin');
$$;

create or replace function is_cook_or_admin() returns boolean
  language sql stable security definer set search_path = meal_planner, public as $$
  select exists (select 1 from users where id = auth.uid() and role in ('cook', 'admin'));
$$;

-- True when the order may still be edited by its owner: week is 'open' AND the
-- order's latest payment is not yet 'confirmed' (ADR-0010).
create or replace function order_is_editable(p_order_id uuid) returns boolean
  language sql stable security definer set search_path = meal_planner, public as $$
  select
    exists (
      select 1
      from orders o
      join week_plans wp on wp.id = o.week_plan_id
      where o.id = p_order_id and wp.status = 'open'
    )
    and coalesce(
      (
        select p.status
        from payments p
        where p.order_id = p_order_id
        order by p.submitted_at desc
        limit 1
      ) <> 'confirmed',
      true   -- no payment yet => still editable
    );
$$;

------------------------------------------------------------------------------
-- 3. Views (summaries). Defined before RLS toggles for readability.
------------------------------------------------------------------------------

-- All summary views use security_invoker so they obey the querying user's RLS
-- (Supabase advisor 0010); the underlying SELECT policies below are written so
-- members/cooks/admins can read what each view needs.
create view daily_egg_summary
  with (security_invoker = on) as
select oi.menu_date, oi.egg, oi.doneness, count(*) as qty
from order_items oi
join orders o on o.id = oi.order_id
group by oi.menu_date, oi.egg, oi.doneness;

-- Order Grid: every active member × every (non-holiday) menu date.
-- No item => 'ไม่กิน'; egg='none' => 'ไม่ทานไข่'; otherwise the egg label (ADR-0005).
-- Filter to a specific week's date range (week_start .. +4) at query time.
create view weekly_order_grid
  with (security_invoker = on) as
select
  u.id as user_id,
  u.display_name,
  m.menu_date,
  case
    when oi.id is null            then 'ไม่กิน'        -- no order item that day
    when oi.egg = 'none'          then 'ไม่ทานไข่'      -- eats, no egg
    when oi.egg = 'fried'
         and oi.doneness = 'soft' then 'ดาวไม่สุก'
    when oi.egg = 'fried'         then 'ไข่ดาวสุก'
    when oi.egg = 'boiled'        then 'ต้ม'
    when oi.egg = 'omelette'      then 'ไข่เจียว'
  end as cell,
  (oi.id is not null) as is_eating
from users u
cross join menus m
left join orders o      on o.user_id = u.id
left join order_items oi on oi.order_id = o.id and oi.menu_date = m.menu_date
where u.is_active
  and u.role <> 'admin'        -- roster = members (and cooks); admins excluded from the grid
  and m.is_holiday = false;

-- Who has not ordered for a given (non-holiday) day.
create view daily_not_ordered
  with (security_invoker = on) as
select m.menu_date, u.id as user_id, u.display_name
from menus m
cross join users u
where m.is_holiday = false
  and u.is_active
  and not exists (
    select 1
    from orders o
    join order_items oi on oi.order_id = o.id
    where o.user_id = u.id and oi.menu_date = m.menu_date
  );

-- Per-week payment status for the admin dashboard. LATERAL picks the LATEST
-- payment per order by submitted_at (append-only, ADR-0009).
create view weekly_payment_status
  with (security_invoker = on) as
select
  wp.id as week_plan_id,
  o.user_id,
  u.display_name,
  (select count(*) from order_items oi where oi.order_id = o.id) as days,
  lp.amount,
  lp.method,
  lp.status
from week_plans wp
join orders o on o.week_plan_id = wp.id
join users u  on u.id = o.user_id
left join lateral (
  select p.amount, p.method, p.status
  from payments p
  where p.order_id = o.id
  order by p.submitted_at desc
  limit 1
) lp on true;

------------------------------------------------------------------------------
-- Table / view grants. RLS (below) does the row-level narrowing; these grants
-- give the `authenticated` role table-level reach. (Supabase normally applies
-- these via default privileges; stated explicitly so the migration is complete.)
------------------------------------------------------------------------------
grant select, insert, update, delete
  on users, week_plans, menus, orders, order_items, payments
  to authenticated;
grant select
  on daily_egg_summary, weekly_order_grid, daily_not_ordered, weekly_payment_status
  to authenticated;

------------------------------------------------------------------------------
-- 4. Row Level Security
------------------------------------------------------------------------------
alter table users       enable row level security;
alter table week_plans  enable row level security;
alter table menus       enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table payments    enable row level security;

-- ---- users ----------------------------------------------------------------
-- Read: any authenticated user can read the roster. The Roster (display_name,
-- picture) is non-sensitive and is required by the Order Grid / not-ordered
-- views (which run security_invoker), where everyone sees everyone (CONTEXT.md).
-- Doc §4 says "self + admin reads all"; broadened to the whole authenticated
-- roster so the grid renders under invoker RLS. (Documented deviation.)
create policy users_select_authed on users
  for select using (auth.uid() is not null);

-- Update own profile (not role/flags enforced in app/server action); admin may update anyone.
create policy users_update_self_or_admin on users
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Insert/delete of roster entries is an admin operation.
create policy users_insert_admin on users
  for insert with check (is_admin());
create policy users_delete_admin on users
  for delete using (is_admin());

-- ---- week_plans ------------------------------------------------------------
-- Any authenticated user reads; only admin writes.
create policy week_plans_select_authed on week_plans
  for select using (auth.uid() is not null);
create policy week_plans_insert_admin on week_plans
  for insert with check (is_admin());
create policy week_plans_update_admin on week_plans
  for update using (is_admin()) with check (is_admin());
create policy week_plans_delete_admin on week_plans
  for delete using (is_admin());

-- ---- menus -----------------------------------------------------------------
create policy menus_select_authed on menus
  for select using (auth.uid() is not null);
create policy menus_insert_admin on menus
  for insert with check (is_admin());
create policy menus_update_admin on menus
  for update using (is_admin()) with check (is_admin());
create policy menus_delete_admin on menus
  for delete using (is_admin());

-- ---- orders ----------------------------------------------------------------
-- Read: owner, or cook/admin.
create policy orders_select_owner_or_staff on orders
  for select using (user_id = auth.uid() or is_cook_or_admin());

-- Insert own order, only while the week is 'open'. Admin may insert for anyone.
create policy orders_insert_owner_open on orders
  for insert with check (
    is_admin()
    or (
      user_id = auth.uid()
      and exists (
        select 1 from week_plans wp
        where wp.id = week_plan_id and wp.status = 'open'
      )
    )
  );

-- Update own order only while editable (week open AND not payment-confirmed, ADR-0010).
create policy orders_update_owner_editable on orders
  for update using (
    is_admin() or (user_id = auth.uid() and order_is_editable(id))
  ) with check (
    is_admin() or (user_id = auth.uid() and order_is_editable(id))
  );

create policy orders_delete_owner_editable on orders
  for delete using (
    is_admin() or (user_id = auth.uid() and order_is_editable(id))
  );

-- ---- order_items -----------------------------------------------------------
-- Ownership is derived through the parent order.
create policy order_items_select_owner_or_staff on order_items
  for select using (
    is_cook_or_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy order_items_insert_owner_editable on order_items
  for insert with check (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and order_is_editable(o.id)
    )
  );

create policy order_items_update_owner_editable on order_items
  for update using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and order_is_editable(o.id)
    )
  ) with check (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and order_is_editable(o.id)
    )
  );

create policy order_items_delete_owner_editable on order_items
  for delete using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and order_is_editable(o.id)
    )
  );

-- ---- payments --------------------------------------------------------------
-- Read: owner (via parent order) or admin.
create policy payments_select_owner_or_admin on payments
  for select using (
    is_admin()
    or exists (
      select 1 from orders o
      where o.id = payments.order_id and o.user_id = auth.uid()
    )
  );

-- Owner inserts a new 'pending' payment for their own order; admin may insert any.
create policy payments_insert_owner_pending on payments
  for insert with check (
    is_admin()
    or (
      status = 'pending'
      and exists (
        select 1 from orders o
        where o.id = payments.order_id and o.user_id = auth.uid()
      )
    )
  );

-- Confirm/reject (and any update) = admin only (ADR / doc §4).
create policy payments_update_admin on payments
  for update using (is_admin()) with check (is_admin());
create policy payments_delete_admin on payments
  for delete using (is_admin());

------------------------------------------------------------------------------
-- Storage: private "slips" bucket
------------------------------------------------------------------------------
-- Path convention: slips/{user_id}/{order_id}/{filename}
-- => the FIRST path segment after the bucket is the owning users.id.
--    (storage.foldername(name))[1] == owner's users.id == auth.uid().
insert into storage.buckets (id, name, public)
values ('slips', 'slips', false)
on conflict (id) do nothing;

-- Read own slips or admin reads any.
create policy slips_read_owner_or_admin on storage.objects
  for select using (
    bucket_id = 'slips'
    and (
      is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Insert (upload) only into your own folder; admin may upload anywhere in the bucket.
create policy slips_insert_owner_or_admin on storage.objects
  for insert with check (
    bucket_id = 'slips'
    and (
      is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Owner/admin may delete their own slips (e.g. replacing a wrong upload).
create policy slips_delete_owner_or_admin on storage.objects
  for delete using (
    bucket_id = 'slips'
    and (
      is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );


-- ===== from 0002_seed_admins.sql =====

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
  set search_path = meal_planner, public
as $$
  update users
     set role = 'admin'
   where line_user_id = p_line_user_id
  returning *;
$$;

comment on function promote_admin(text) is
  'Sets role=admin for the user with the given LINE userId. App calls this (or sets role on upsert) for every id in ADMIN_LINE_USER_IDS at login (ADR-0008/0002). Returns the updated row, or no rows if the LINE userId is not yet in the roster.';


-- ===== from 0003_voting.sql =====

-- 0003_voting.sql — Phase 6: monthly menu voting (ADR-0011).
-- No LLM/AI (ADR-0006): tally is plain SQL counts. Around the 16th, an admin opens
-- a round for next month, adds candidate dishes, members vote (approval-style:
-- a member may vote for several candidates, at most once each), then the admin
-- promotes winners into the menu calendar (menus, keyed by date — ADR-0004).

create type vote_round_status as enum ('draft', 'open', 'closed');

-- One voting round per target month.
create table vote_rounds (
  id           uuid primary key default gen_random_uuid(),
  target_month date not null unique,                  -- first day of the month being planned
  title        text,
  status       vote_round_status not null default 'draft',
  opens_at     timestamptz,
  closes_at    timestamptz,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

-- Candidate dishes proposed for a round (admin-curated in v1).
create table menu_candidates (
  id                  uuid primary key default gen_random_uuid(),
  round_id            uuid not null references vote_rounds(id) on delete cascade,
  name                text not null,
  description         text,
  proposed_by_user_id uuid references users(id),
  proposed_by_name    text,
  created_at          timestamptz not null default now()
);
create index menu_candidates_round_idx on menu_candidates (round_id);

-- One member's approval vote for one candidate. Unique => no double-voting a candidate.
create table votes (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references vote_rounds(id) on delete cascade,
  candidate_id uuid not null references menu_candidates(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (candidate_id, user_id)
);
create index votes_round_idx on votes (round_id);
create index votes_candidate_idx on votes (candidate_id);

-- Tally (plain counts, no AI). security_invoker → obeys the reader's RLS;
-- votes are readable by any authenticated user (an office lunch poll is not secret),
-- so members see live counts.
create view candidate_vote_counts
  with (security_invoker = on) as
select c.round_id, c.id as candidate_id, c.name, count(v.id) as votes
from menu_candidates c
left join votes v on v.candidate_id = c.id
group by c.round_id, c.id, c.name;

grant select, insert, update, delete on vote_rounds, menu_candidates, votes to authenticated;
grant select on candidate_vote_counts to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table vote_rounds     enable row level security;
alter table menu_candidates enable row level security;
alter table votes           enable row level security;

-- vote_rounds: read by any authenticated user; write by admin only.
create policy vote_rounds_select_authed on vote_rounds
  for select using (auth.uid() is not null);
create policy vote_rounds_insert_admin on vote_rounds
  for insert with check (is_admin());
create policy vote_rounds_update_admin on vote_rounds
  for update using (is_admin()) with check (is_admin());
create policy vote_rounds_delete_admin on vote_rounds
  for delete using (is_admin());

-- menu_candidates: read by any authenticated user; write by admin only (v1).
create policy menu_candidates_select_authed on menu_candidates
  for select using (auth.uid() is not null);
create policy menu_candidates_insert_admin on menu_candidates
  for insert with check (is_admin());
create policy menu_candidates_update_admin on menu_candidates
  for update using (is_admin()) with check (is_admin());
create policy menu_candidates_delete_admin on menu_candidates
  for delete using (is_admin());

-- votes: readable by all authenticated (for live counts). A member may insert/delete
-- ONLY their own vote, and ONLY while the round is 'open'. Admin may not vote-by-proxy.
create policy votes_select_authed on votes
  for select using (auth.uid() is not null);

create policy votes_insert_owner_open on votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from vote_rounds r
      where r.id = votes.round_id and r.status = 'open'
    )
    -- candidate must belong to the same round
    and exists (
      select 1 from menu_candidates c
      where c.id = votes.candidate_id and c.round_id = votes.round_id
    )
  );

create policy votes_delete_owner_open on votes
  for delete using (
    user_id = auth.uid()
    and exists (
      select 1 from vote_rounds r
      where r.id = votes.round_id and r.status = 'open'
    )
  );


-- ===== grants + expose the schema to the Data API (PostgREST) =====
grant all privileges on all tables    in schema meal_planner to service_role;
grant all privileges on all sequences in schema meal_planner to service_role;
grant execute on all functions        in schema meal_planner to service_role, authenticated;

-- Add meal_planner to the exposed schemas (keep existing public + graphql_public).
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, meal_planner';
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
