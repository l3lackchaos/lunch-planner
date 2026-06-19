# Supabase — database layer

Schema and RLS for the LINE LIFF office-lunch app. Implements
[`docs/03-data-model.md`](../docs/03-data-model.md) and the locked ADRs.

## Migrations

| File | Purpose |
|------|---------|
| `migrations/0001_init.sql` | Enums, tables, indexes, RLS helpers, RLS policies, summary views, and the private `slips` storage bucket + policies. |
| `migrations/0002_seed_admins.sql` | `promote_admin(line_user_id)` helper used to set `role='admin'`. |

## Applying

Local stack:

```bash
supabase start              # boots local Postgres + Studio + storage
supabase db reset           # applies every migration in ./migrations in order
```

Remote project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push            # pushes pending migrations in ./migrations to the linked project
```

Migrations apply in lexical order, so `0001_init.sql` runs before
`0002_seed_admins.sql`. There is no live database in this repo; correctness is
maintained by review.

## Auth model (ADR-0002)

The Next.js login route verifies the LINE ID token, upserts the Member, and mints
a Supabase-compatible JWT with `sub = users.id` and `role = 'authenticated'`.
Consequently **`auth.uid()` returns `users.id`** throughout the policies and
helper functions — there is no separate `auth.users` row mapping. The
service-role key (which bypasses RLS) is reserved for trusted server actions
(e.g. confirming/rejecting payments).

## Storage path convention (`slips` bucket, private)

```
slips/{user_id}/{order_id}/{filename}
```

The **first path segment is the owning `users.id`**. RLS on `storage.objects`
checks `(storage.foldername(name))[1] = auth.uid()::text`, so a Member can read
and upload only their own slips; admins can access any. The bucket is private —
the app serves slips via signed URLs. Store the object's `name` in
`payments.slip_path`.

## Admin seeding (ADR-0008)

Admins are **not** statically seeded, because Members only get a `users.id` when
they are created/claimed at login. The login route holds an `ADMIN_LINE_USER_IDS`
env list; when it upserts a Member whose LINE `sub` is in that list, it sets
`role='admin'`. The `promote_admin(p_line_user_id text)` SQL helper performs the
same idempotent flip for manual promotion or re-runs:

```sql
select promote_admin('Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
```

It returns the updated row, or no rows if that LINE userId is not yet in the
roster (create/claim the Member first, then promote).

## Notes on key decisions

- **Menus keyed by date (ADR-0004):** `menus.menu_date` is unique; menus are not
  children of `week_plans`. Orders/items join menus by date.
- **Payments append-only (ADR-0009):** no `unique(order_id)`. The "current"
  payment is the latest row by `submitted_at` (see `weekly_payment_status` and
  `order_is_editable`).
- **Order lock (ADR-0010):** Members may edit orders/items only while the Week
  Plan is `open` AND their latest payment is not `confirmed`, enforced by the
  `order_is_editable()` helper inside the RLS policies.
- **Two "no" states (ADR-0005):** absent order item = `ไม่กิน`; item with
  `egg='none'` = `ไม่ทานไข่`. The `weekly_order_grid` view renders both.
