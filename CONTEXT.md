# Lunch Planner — Context

Bounded context for an office lunch ordering, egg-selection, and weekly payment
workflow operated from inside a LINE group via LIFF. Single context; this file is
the source of truth for the domain language used across `docs/` and the codebase.

## Language

**Member**:
A person in the office LINE group who orders lunch. Identified by their LINE account.
_Avoid_: User (reserve for the auth/account record), employee.

**Admin**:
A Member with elevated rights who manages plans/menus and confirms payments.
_Avoid_: Owner, manager, collector.

**Cook**:
An optional read-only role that sees the daily egg counts. Not every deployment has one.
_Avoid_: Chef, kitchen.

**Week Plan**:
One billing round covering Monday–Friday, owning price-per-day, order deadline, and status (`draft → open → closed → billed`).
_Avoid_: Week, sprint, cycle, batch.

**Menu**:
The single dish planned for one working day, keyed by calendar date, with a proposer and optional holiday flag.
_Avoid_: Dish, meal, item.

**Proposer**:
The person who chose a day's **Menu** — a linked **Member** or, failing that, an admin-typed free-text name.
_Avoid_: Author, owner, cook.

**Holiday**:
A working day marked closed for ordering — no orders, no charge (e.g. Wed 3 Jun 2026).
_Avoid_: Day off, break.

**Order**:
A Member's single set of choices for one **Week Plan** (exactly one per Member per Week Plan), composed of Order Items.
_Avoid_: Purchase, booking, cart.

**Order Item**:
One Member's choice for one day — the **Egg** choice plus optional doneness/note; its existence means the Member eats that day.
_Avoid_: Line, entry, selection.

**Egg**:
The egg choice on an Order Item — `boiled`/`fried`(+doneness)/`omelette`/`none` (ไม่ทานไข่ — eats, no egg).
_Avoid_: Egg type, egg style.

**Not eating (ไม่กิน)**:
A day with no Order Item for that Member — not ordering, not charged; distinct from `none` (ไม่ทานไข่).
_Avoid_: ไม่ทานไข่, skip.

**Payment**:
A Member's settlement of one **Order** — method `slip`/`cash`, status `pending → confirmed | rejected`, confirmed manually by an Admin.
_Avoid_: Transaction, charge, bill.

**Order Grid**:
The summary matrix of all Members × the week's days, each cell showing the Egg choice, "ไม่ทานไข่", or "ไม่กิน".
_Avoid_: Report, sheet.

## Relationships

- A **Week Plan** has 5 **Menus** (by date) minus any **Holiday**; price-per-day is per Week Plan.
- A **Member** has at most one **Order** per **Week Plan**; an **Order** has 0..5 **Order Items**.
- An **Order** has one current **Payment**; amount = (count of Order Items) × price-per-day.
- A **Menu** has one **Proposer** (Member or free-text), unless it is a **Holiday**.
- The **Order Grid** is derived over the full **Member** roster, so non-ordering Members show "ไม่กิน".

## Example dialogue

> **Dev:** "If a **Member** has an **Order Item** with Egg `none`, are they 'ไม่กิน'?"
> **Domain expert:** "No. `none` is **ไม่ทานไข่** — they eat and pay, just no egg. 'ไม่กิน' is
> when there's *no* Order Item for that day at all, and they aren't charged."
>
> **Dev:** "Who appears in the **Order Grid**?"
> **Domain expert:** "Everyone on the roster — even people who never ordered show as 'ไม่กิน'."

## Flagged ambiguities

- "ไม่กิน" vs "ไม่ทานไข่" — resolved: distinct (no Order Item vs Egg=`none`).
- "Proposer" vs "Cook" — resolved: Proposer chose the Menu; Cook is a read-only role.
- "User" vs "Member" — resolved: User = auth record; Member = domain person.
- Roster source (who shows in the Order Grid) — see ADR-0005 / open item.
