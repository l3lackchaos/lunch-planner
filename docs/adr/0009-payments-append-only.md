# Payments are append-only; no unique constraint per Order

Each payment attempt is a new `payments` row; there is no `unique(order_id)`. The current payment
for an Order is the latest row by `submitted_at`. A reader will be tempted to add a unique
constraint "to keep one payment per order" — do not: when a slip is rejected and the Member
re-submits, we keep the rejected attempt for audit rather than overwriting it. Trade-off: queries
must select the latest (or latest non-rejected) row instead of a single guaranteed row.
