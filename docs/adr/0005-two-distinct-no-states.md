# Model "ไม่กิน" and "ไม่ทานไข่" as two distinct states

"Not eating" (ไม่กิน) is represented by the *absence* of an Order Item for that day; "no egg"
(ไม่ทานไข่) is an Order Item with Egg = `none`. A reader might assume a single "no" value — this
records that they are deliberately different: ไม่กิน means no lunch and no charge, while ไม่ทานไข่
means a normal paid lunch without an egg. The Order Grid is computed over the full Member roster
so non-ordering Members render as "ไม่กิน". Trade-off: every count/billing query must treat a
missing Item and an Item-with-`none` differently, which is the price of matching how the group
actually talks and bills.
