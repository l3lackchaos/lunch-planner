# Monthly menu voting = approval votes on a candidate pool; admin schedules winners

Phase 6 voting is modelled as: an admin opens one **vote round** per target month and
curates **candidate** dishes; members cast **approval votes** (vote for as many candidates as
they like, at most once each) while the round is `open`; the tally is a plain SQL count
(no AI, ADR-0006); the admin then **promotes** top candidates into the menu calendar
(`menus`, keyed by date — ADR-0004), keeping final scheduling human.

A reader might expect "one vote per weekday slot that auto-fills next month". We chose
approval-on-a-pool instead because a month has ~20 distinct working days that cannot be
derived from 5 weekday winners, and because the group's real workflow keeps the admin in
charge of which dish lands on which date. Members propose-by-admin in v1 (candidates are
admin-created); member-submitted candidates can be added later behind moderation. Votes are
readable by all authenticated users so counts are live (an office lunch poll is not secret).
