# 🍱 Lunch Planner — LINE LIFF

ระบบจัดการ **มื้ออาหารกลางวันออฟฟิศ** ผ่าน LINE (LIFF) สำหรับกลุ่มแชทที่ต้อง
สั่งอาหาร เลือกไข่รายวัน แจ้งวิธีชำระเงิน (สลิป/เงินสด) และเก็บเงินทุกวันพฤหัสบดี
โดยมีผู้ดูแล (แอดมิน) เป็นคนกดยืนยันการชำระเงินด้วยตัวเอง (ไม่ต้องเช็คสลิปกับ API ธนาคาร)

> ที่มา: ทุกวันนี้ออฟฟิศต้องวุ่นกับการทวงเงิน จดออเดอร์ไข่ และทำแพลนเมนูในแชต LINE
> เอกสารชุดนี้คือ **task / plan / spec** ฉบับเต็มสำหรับสร้างเว็บไซต์ที่จัดการทุกอย่างได้ในที่เดียว

---

## เอกสาร (อ่านตามลำดับ)

| # | เอกสาร | เนื้อหา |
|---|--------|---------|
| 01 | [docs/01-spec.md](docs/01-spec.md) | Product spec — personas, user flows, ฟีเจอร์, business rules |
| 02 | [docs/02-architecture.md](docs/02-architecture.md) | สถาปัตยกรรม, LIFF auth, security, deployment |
| 03 | [docs/03-data-model.md](docs/03-data-model.md) | Database schema (Supabase/Postgres) + RLS + storage |
| 04 | [docs/04-ux-ui.md](docs/04-ux-ui.md) | ทิศทาง UX/UI, รายการหน้าจอ, design tokens, performance |
| 05 | [docs/05-task-plan.md](docs/05-task-plan.md) | แผนงานแบบ phase + task + acceptance criteria |

## Tech Stack (ยืนยันแล้ว)

- **Frontend / Server:** Next.js (App Router, TypeScript) + Tailwind CSS
- **LINE:** LIFF SDK (`@line/liff`) + LINE Login + (ภายหลัง) Messaging API สำหรับแจ้งเตือน
- **Backend / DB:** Supabase (Postgres + Auth + Storage สำหรับรูปสลิป + RLS)
- **Deploy:** Vercel
- **Design:** Figma (จัดการ design system) / Canva (asset ประกอบ)

## ขอบเขต v1 (MVP)

1. ✅ สั่งอาหาร + เลือกไข่รายวัน (เลือกวันที่กิน + ชนิดไข่: ต้ม/ดาว/เจียว/ไม่กิน)
2. ✅ แจ้งชำระเงิน (อัปโหลดสลิป หรือ เงินสด) + แอดมินกดยืนยันเอง — เก็บเงินทุกวันพฤหัสบดี
3. ✅ สรุปสำหรับแม่ครัว (นับจำนวนไข่แต่ละชนิด/หัวต่อวัน) + dashboard ใครจ่าย/ใครค้าง
4. ✅ แอดมินสร้าง/แก้ไขแพลนเมนูประจำสัปดาห์

## ขอบเขตที่เลื่อนไปเฟสถัดไป

- 🗳️ **โหวตเมนูประจำเดือน** (ประมาณวันที่ 16 ของทุกเดือน) เพื่อกำหนดเมนูของเดือนถัดไป
  → ออกแบบเป็น Phase 6 ใน [docs/05-task-plan.md](docs/05-task-plan.md) (จะคุยรายละเอียดกันอีกรอบ)

## โครงสร้างโค้ด

```
src/
  app/
    (member)/        # "/" สัปดาห์นี้, order/[weekId], payment/[orderId], me
    (admin)/admin/   # home, roster, week/[id], menus(+print), payments/[id], summary/[id]
    api/auth/line/   # LINE ID token → Supabase JWT handshake
    preview/         # UI kit showcase (public)
  components/ui/     # design system (EggPicker, DayCard, StatusChip, ...)
  components/providers/LiffProvider.tsx
  lib/               # supabase clients, auth (jwt/session/guards), date/egg/money, line/notify, db/types
supabase/migrations/ # schema + RLS + views + storage ; seed.sql ; README.md
docs/                # spec, architecture, data-model, ux-ui, task-plan, adr/, DEPLOY.md, REVIEW.md
```

## เริ่มใช้งาน

ต้อง provision Supabase + LINE LIFF + Vercel ก่อน — ดู **[docs/DEPLOY.md](docs/DEPLOY.md)**

```bash
pnpm install
pnpm dev          # /preview ดู UI kit ได้เลย (ส่วนที่ล็อกอิน LINE ต้องเปิดผ่าน LIFF)
pnpm test         # unit tests
pnpm build        # production build
```

---

_สถานะ: **Phase 0–5 พัฒนาเสร็จ build เขียว** · Phase 6 (โหวตเมนู) เลื่อนไว้_
_ดูสถานะรายละเอียดใน [docs/05-task-plan.md](docs/05-task-plan.md)_
