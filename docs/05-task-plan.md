# 05 — Task Plan

แผนงานแบบ phase. แต่ละ task มี **Acceptance Criteria (AC)** และ **Depends on**.
ลำดับแนะนำ: Phase 0 → 1 → 2 → 3 → 4 → 5. Phase 6 (โหวต) เลื่อนไว้ก่อน (คุยกันอีกรอบ)

ป้ายกำกับขนาดงาน: 🟢 เล็ก · 🟡 กลาง · 🔴 ใหญ่

---

## Phase 0 — Foundations (ตั้งโครง)

- **T0.1 🟡 Scaffold โปรเจกต์** — Next.js (App Router, TS) + Tailwind + ESLint/Prettier + โครงโฟลเดอร์ route groups `(member)`/`(admin)`
  - AC: รัน.dev ได้, หน้าเปล่าโหลดผ่าน, lint ผ่าน
- **T0.2 🟡 ตั้ง Supabase** — สร้าง project, เปิด RLS, สร้าง enums + ตารางตาม [03-data-model.md](03-data-model.md) ผ่าน migration, สร้าง bucket `slips` (private)
  - AC: migration apply สำเร็จ, ตาราง/enum/bucket ครบ, RLS เปิดทุกตาราง
  - Depends on: —
- **T0.3 🟡 LINE setup** — สร้าง LINE Login channel + LIFF app, เก็บ `LIFF_ID`/channel id/secret
  - AC: LIFF endpoint ชี้ preview URL, login ได้จริงในมือถือ
- **T0.4 🔴 Auth pipeline** — LIFF init ฝั่ง client → ส่ง ID token → route `/api/auth/line` verify กับ LINE → upsert `users` → ออก Supabase JWT (RLS-ready) → ตั้ง session
  - AC: ผู้ใช้ใหม่ถูกสร้างอัตโนมัติ, `auth.uid()` ใช้ใน RLS ได้, refresh แล้วยัง login อยู่
  - Depends on: T0.1, T0.2, T0.3
- **T0.5 🟢 Roles/seed** — seed แอดมินคนแรกจาก `ADMIN_LINE_USER_IDS`, helper `is_admin()/is_cook_or_admin()`, guard ฝั่ง server
  - Depends on: T0.4
- **T0.6 🟢 Deploy pipeline (Vercel)** — เชื่อม repo, ตั้ง env ทั้งหมด, preview + production deploy
  - AC: push แล้ว deploy preview สำเร็จ, LIFF เปิด preview ได้

---

## Phase 1 — Admin Planner (แอดมินสร้างแพลน)

- **T1.0 🟡 Roster management + claim-on-login (ADR-0008)** — แอดมินสร้าง/แก้รายชื่อสมาชิกล่วงหน้า (display_name, ไม่มีบัญชี LINE); ตอน login LIFF ครั้งแรก จับคู่กับ roster ที่ยังไม่ claim แล้วเซ็ต `line_user_id`/`claimed_at` (ถ้ากำกวมให้แอดมินช่วยเลือก); flag `is_active`
  - AC: ตารางสรุปโชว์คนที่ยังไม่เปิดแอป, login แล้วไม่เกิดบัญชีซ้ำ, ปิด is_active แล้วหายจากสรุป
  - Depends on: Phase 0
- **T1.1 🟡 Week plan CRUD** — สร้าง/แก้ `week_plans` (week_start, price_per_day, **deadline = พฤหัสก่อน week_start**, note), เปลี่ยน status draft→open→closed→billed
  - AC: แอดมินสร้างสัปดาห์ได้, กันสร้าง week_start ซ้ำ, deadline คำนวณเป็นพฤหัสก่อนสัปดาห์กิน (ADR-0007), non-admin ทำไม่ได้ (RLS)
  - Depends on: Phase 0
- **T1.2 🔴 Menu calendar (ปฏิทินรายเดือน)** — ตาราง `menus` key ด้วย `menu_date`; แก้เมนู/รูป + **คนเลือก (hybrid: ผูก `proposed_by_user_id` หรือพิมพ์ `proposed_by_name` เอง)** + toggle `is_holiday`; มุมมองปฏิทินเดือน
  - AC: วางเมนูล่วงหน้าทั้งเดือนได้, วันหยุด mark แล้วไม่ถูกสั่ง/ไม่คิดเงิน, เลือกคนเลือกจากรายชื่อสมาชิกได้, พิมพ์ชื่ออิสระได้เมื่อไม่มีบัญชี, แสดงผล = display_name ของสมาชิก ไม่งั้นใช้ชื่อ text
  - Depends on: T1.1
- **T1.3 🟢 Print/share ปฏิทินเดือน** — หน้า print-friendly ของปฏิทินเมนู (ตรงกับที่โพสต์กลุ่ม)
  - Depends on: T1.2
- **T1.4 🟢 Admin home list** — รายการสัปดาห์/รอบบิล + สถานะ + ปุ่มจัดการ
  - Depends on: T1.1

---

## Phase 2 — Member Ordering + Egg (สั่ง + เลือกไข่)

- **T2.1 🟡 หน้า "สัปดาห์นี้"** — แสดงเมนู จ–ศ ของสัปดาห์ `open`, ราคา/วัน, สถานะออเดอร์/จ่ายเงินของฉัน
  - AC: ถ้ายังไม่มีสัปดาห์ open แสดง empty state; โหลดเร็ว (RSC)
  - Depends on: Phase 1
- **T2.2 🔴 Order flow** — toggle เลือกวันที่กิน + เลือกไข่ต่อวัน (boiled/fried/omelette/none) + doneness(สุก/ไม่สุก) + note; ปุ่ม "ครบ 5 วัน"; sticky summary ยอดเงิน; บันทึกเป็น `orders`+`order_items` (upsert)
  - AC: 1 ออเดอร์/สัปดาห์, แก้ได้เฉพาะ status='open' & ก่อน deadline, **วันหยุดไม่ให้เลือก** (F6), **ล็อกเมื่อ payment=confirmed** (ADR-0010), ยอด = วัน×ราคา ถูกต้อง
  - Depends on: T2.1
- **T2.3 🟢 RLS ตรวจสิทธิ์ order** — เจ้าของแก้ได้เท่านั้น, admin/cook อ่านได้
  - AC: ผู้ใช้ A แก้ออเดอร์ B ไม่ได้ (ทดสอบจริง)
  - Depends on: T2.2

---

## Phase 3 — Payment + Admin Confirm (ชำระเงิน + ยืนยัน)

- **T3.1 🟡 แจ้งชำระเงิน (member)** — แสดงยอดคำนวณ, เลือก slip/cash, อัปสลิปเข้า bucket `slips` (private, validate type/size, ย่อรูป), สร้าง `payments` (pending)
  - AC: ยอดตรงกับออเดอร์, สลิปเก็บ private, สถานะ pending แสดงผล
  - Depends on: Phase 2
- **T3.2 🟡 คิวยืนยัน (admin)** — list pending ต่อสัปดาห์, ดูสลิปผ่าน signed URL, ปุ่มยืนยัน/ปฏิเสธ(+เหตุผล), บันทึก confirmed_by/at
  - AC: เฉพาะ admin ทำได้, ปฏิเสธต้องมีเหตุผล, สถานะอัปเดตให้ member เห็น
  - Depends on: T3.1
- **T3.3 🟢 สถานะฝั่ง member** — แสดง pending/confirmed/rejected(+เหตุผล), แจ้งใหม่ได้ถ้าถูกปฏิเสธ → **insert payment แถวใหม่ (append-only, ADR-0009)** เก็บประวัติของเดิม
  - AC: แจ้งซ้ำได้, แถวเก่าไม่หาย, dashboard อิงแถวล่าสุด
  - Depends on: T3.2

---

## Phase 4 — Summaries & Reports (สรุป)

- **T4.1 🟡 สรุปแม่ครัวรายวัน (Cook count)** — เลือกวัน → นับไข่แต่ละชนิด (+สุก/ไม่สุก) + หัว + note พิเศษ + **รายชื่อคนที่ยังไม่สั่ง** (view `daily_not_ordered`) + ปุ่มคัดลอกข้อความสรุป
  - AC: ตัวเลขตรงกับ order_items, คัดลอกไปวางในแชตได้, รายชื่อคนไม่สั่งถูกต้อง
  - Depends on: Phase 2
- **T4.1b 🔴 ตารางสรุปออเดอร์ (Order Grid)** — มุมมองตาราง สมาชิกทุกคน × จ–ศ (view `weekly_order_grid`); ช่องแสดง ชนิดไข่ / "ไม่ทานไข่" / "ไม่กิน" พร้อมสีแยกสถานะ + ไฮไลต์คนไม่กินทั้งสัปดาห์; **print/export เป็นรูป + คัดลอก**
  - AC: ครอบคลุมสมาชิกทุกคน (รวมคนไม่สั่ง), แยก "ไม่กิน" vs "ไม่ทานไข่" ถูกต้อง, ตารางตรงกับภาพจริงในกลุ่ม, print/รูป ใช้งานได้
  - Depends on: T4.1
- **T4.2 🟡 Dashboard จ่ายเงิน (admin)** — ต่อสัปดาห์: ใครจ่าย/ค้าง, ยอดรวมที่ยืนยันแล้ว, จำนวนหัว
  - AC: ตรงกับ payments/orders, กรองตามสถานะได้
  - Depends on: Phase 3
- **T4.3 🟢 Cook role (optional)** — ให้ role `cook` เข้าหน้า summary แบบ read-only
  - Depends on: T4.1
- **T4.4 🟢 Search input (ค้นหารายชื่อ)** — ช่อง Search ในหน้า payments dashboard + summary,
  กรองตาม `display_name` (debounce ~250ms, case/space-insensitive), ทำงานร่วมกับตัวกรองสถานะ
  - AC: พิมพ์ชื่อแล้วรายการกรองถูกต้อง, ล้างคำค้นกลับมาครบ, มี empty state เมื่อไม่พบ,
    touch target/aria-label ผ่าน (a11y); dataset ระดับสัปดาห์เล็ก → กรองฝั่ง client ได้
  - Depends on: T4.1 (summary), T4.2 (dashboard)

---

## Phase 5 — Polish, Notify, QA

- **T5.1 🟡 UX/UI pass** — ใช้ design tokens จาก [04-ux-ui.md](04-ux-ui.md), Figma component → โค้ด, micro-states/empty/loading
- **T5.2 🟢 site-audit** — รัน `site-audit` ตรวจ UX/accessibility/perf แล้วแก้ตามผล
- **T5.3 🟡 E2E tests** — `webapp-testing` (Playwright): flow สั่ง→จ่าย→ยืนยัน→สรุป; unit test การคำนวณยอด/นับไข่
- **T5.4 🟡 LINE notifications (Messaging API)** — push เมื่อ: เปิดรับสั่ง, เตือนจ่ายเงินวันพฤหัส, ยืนยัน/ปฏิเสธแล้ว
  - Note: ต้องเปิด Messaging API channel เพิ่ม
  - **Decision:** การโพสต์ปฏิทิน/ตารางสรุปเข้ากลุ่มเมื่อแก้เมนู → **คงไว้แบบ manual** (ใช้ปุ่ม
    print/export แล้วโพสต์เอง) ตามที่ตกลง — ไม่ทำ auto-post เข้ากลุ่มในขอบเขตนี้
- **T5.5 🟢 Performance & security review** — perf budget, ตรวจ RLS/leak, signed URL, secret handling

---

## Phase 6 — Monthly Menu Voting (DEFERRED 🗳️)

> ~วันที่ 16 ของทุกเดือน เปิดโหวตเมนูกลางวันของแต่ละวันสำหรับ "เดือนถัดไป" แล้วนำผลไป
> สร้างแพลน. **ยังไม่ทำใน v1 — จะคุยรายละเอียดกันอีกรอบ.** ร่างแนวทาง:
- เพิ่มตาราง `vote_rounds`, `menu_candidates`, `votes` (ดู [03-data-model.md](03-data-model.md) §2)
- แอดมินเปิดรอบโหวต + ใส่ candidate ต่อ weekday
- สมาชิกโหวต 1 เสียง/วัน, สรุปผล, แปลงผู้ชนะเป็น `menus` ของเดือนถัดไป
- **ไม่ใช้ AI/LLM** ในเฟสนี้ (กันค่าใช้จ่าย API) — นับคะแนนด้วยตรรกะธรรมดาในฐานข้อมูล

---

## สรุป Milestones

| Milestone | ครอบคลุม | ผลลัพธ์ |
|-----------|----------|---------|
| **M1 — Walking skeleton** | Phase 0 | login ผ่าน LIFF + DB + deploy ได้ |
| **M2 — Admin can plan** | Phase 1 | แอดมินสร้างแพลนสัปดาห์ได้ |
| **M3 — Members can order** | Phase 2 | สมาชิกสั่ง + เลือกไข่ได้ |
| **M4 — Money flow** | Phase 3 | แจ้งชำระ + แอดมินยืนยัน |
| **M5 — MVP complete** | Phase 4–5 | สรุปแม่ครัว + dashboard + แจ้งเตือน + QA |
| **M6 — Voting** | Phase 6 | (เลื่อน) โหวตเมนูประจำเดือน |

## Open questions / assumptions

- ราคา/วัน default = 20฿ (จากสลิปจริง 100฿/5วัน) — แอดมินปรับได้ ✔ สมมติฐาน
- รอบบิล = จ–ศ, deadline = พฤหัส ✔ สมมติฐาน (ยืนยันได้)
- "เงินสด" = แอดมินกดยืนยันเองหลังรับเงินจริง ✔
- ต้องการ role `cook` แยกไหม หรือให้แอดมินแชร์สรุปพอ? → ทำเป็น optional (T4.3)
- แจ้งเตือนผ่าน LINE push (T5.4) ต้องเปิด Messaging API channel — ยืนยันว่าต้องการ
