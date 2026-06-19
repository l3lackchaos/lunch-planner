# Admins pre-create roster Members; LINE accounts are claimed on first login

The Member roster is not solely login-derived. An Admin can create roster Members by name ahead
of time so the Order Grid lists everyone (matching the printed table, which includes people who
may never open the app). On a Member's first LIFF login, the system links their LINE account to
a matching unclaimed roster record (admin-assisted if ambiguous) instead of creating a duplicate.
Consequence: `users.line_user_id` is nullable until claimed, and login must resolve to an
existing roster record before inserting a new one. Trade-off accepted over a login-only roster,
which would hide non-app Members from summaries.
