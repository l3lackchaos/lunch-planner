# Confirm payments manually; no bank/slip-verification API

Payment slips are uploaded as images and an Admin confirms or rejects each one by hand; the
system does not call any bank or slip-verification API. This is a deliberate deviation a future
reader might "fix" — it is intentional. The group already operates this way, automated slip
verification adds cost, integration, and failure modes, and the volume (one office group) does
not justify it. Amount is computed by the system (days × price-per-day); the human only attests
that money was received.
