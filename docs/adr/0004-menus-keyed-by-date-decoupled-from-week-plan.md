# Key Menus by calendar date, decoupled from Week Plan

Menus are stored keyed by `menu_date` and planned ahead as a monthly calendar, rather than as
children of a Week Plan. A future reader expecting the original weekly model will wonder why —
the reason: the group plans menus a month at a time (with per-day proposer and holidays), while
billing is a separate weekly concern. Week Plans (billing rounds) reference the dates by range.
Trade-off: queries join Orders/Items to Menus by date instead of by a foreign key, in exchange
for monthly planning and clean separation of "what's for lunch" from "who owes money".
