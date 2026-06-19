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
