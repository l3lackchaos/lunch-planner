# Lock an Order once its Payment is confirmed

Orders are editable while the Week Plan is `open` — except once the Member's Payment is
`confirmed`, at which point their Order is locked. A reader seeing the "editable while open" rule
will wonder why a confirmed Member can't change days; this records the deliberate exception that
keeps the confirmed amount and the Order in agreement (no silent divergence, no refund/top-up
flow). To change a locked Order, an Admin must reopen it. Trade-off chosen over recomputing
balances and handling partial refunds, which the manual cash workflow does not support.
