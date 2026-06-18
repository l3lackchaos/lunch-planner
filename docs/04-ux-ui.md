# 04 — UX / UI & Performance

> อ้างอิงหลักการจากสกิล `frontend-design` (หลีกเลี่ยง "AI slop": cream+serif+terracotta,
> ดำ+เขียวสะท้อนแสง, broadsheet) และ `theme-factory`. เป้าหมาย: ดูตั้งใจ ไม่เหมือน template
> และเหมาะกับบริบท **โรงอาหารออฟฟิศไทย**

## 1. Design brief

- **Subject:** มื้อกลางวันออฟฟิศแบบไทย ๆ — ข้าวราดแกง + ไข่ตามสั่ง, จดออเดอร์บนกระดาน
- **Audience:** เพื่อนร่วมงาน หยิบมือถือกดเร็ว ๆ ระหว่างวันยุ่ง ๆ
- **Single job ของหน้าหลัก:** "สัปดาห์นี้ฉันกินวันไหน ไข่อะไร และจ่ายเงินหรือยัง"
- **Signature element:** การ์ดรายวันสไตล์ "ใบสั่งอาหาร/กระดานเมนู" ที่มีไอคอนไข่ชัดเจน
  เลือกแล้วเห็นสถานะทันที (เหมือนติ๊กบนกระดานจริง)

## 2. Design tokens (ร่าง — ปรับใน Figma ได้)

ทิศทาง: **โทนอุ่นแบบโรงอาหาร** แต่คุมด้วย neutral สะอาด ไม่ใช้ม่วง gradient/มุมโค้งเท่ากันหมด

- **Palette (ร่าง 4–6 สี):**
  - `--ink: #23201C` (ตัวอักษรหลัก — น้ำตาลเข้มเกือบดำ)
  - `--paper: #FBF7F0` (พื้นหลัง — ขาวนวลแบบกระดาษห่อข้าว)
  - `--yolk: #F5A623` (ไข่แดง — สี accent หลัก/CTA)
  - `--leaf: #2E7D5B` (เขียวใบเตย — สถานะสำเร็จ/จ่ายแล้ว)
  - `--chili: #D7402B` (พริก — เตือน/ค้างชำระ/ปฏิเสธ)
  - `--line-brand: #06C755` (เขียว LINE — ใช้เท่าที่จำเป็นกับ context LINE)
- **Type:** ฟอนต์ไทยอ่านง่ายบนมือถือ — เช่น **LINE Seed Sans TH** หรือ **IBM Plex Sans Thai**
  (display เน้นน้ำหนักหนาเป็นหัวข้อ, body น้ำหนักปกติ, ตัวเลข/ยอดเงินใช้ tabular)
- **Shape/spacing:** การ์ดมุมโค้งพอประมาณ (ไม่เท่ากันทุกองค์ประกอบ), เงาบางเบา,
  spacing scale 4/8/12/16/24/32
- **Iconography:** ไอคอนไข่แต่ละชนิด (ต้ม/ดาว/เจียว) เป็นเอกลักษณ์ — วาดเองหรือทำใน Canva/Figma

> ⚠️ ก่อนลงมือ ให้ทำ design pass ใน Figma: เทียบ palette/type กับ brief ว่าไม่ใช่ค่า default
> ที่จะออกมาเหมือนทุกเว็บ — ปรับให้เป็น "choice for this brief"

## 3. รายการหน้าจอ (Screens)

### Member
1. **Splash/Auth** — LIFF init + LINE login (โปร่ง, แค่โลโก้ + spinner)
2. **สัปดาห์นี้ (Home `/`)** — การ์ดวัน จ–ศ พร้อมเมนู + สถานะ "เลือกแล้ว/ยัง", ยอดรวม, แถบสถานะจ่ายเงิน
3. **เลือกออเดอร์ (`/order/[weekId]`)** — ต่อวัน: toggle "กินวันนี้" + เลือกไข่ (ต้ม/ดาว/เจียว/ไม่เอา) + สุก/ไม่สุก + note; ปุ่ม "เลือกครบ 5 วัน"; sticky summary bar ยอดเงิน + บันทึก
4. **แจ้งชำระเงิน (`/payment/[orderId]`)** — แสดงยอด, เลือกสลิป/เงินสด, อัปรูปสลิป (preview), ส่ง; แสดงสถานะ pending/confirmed/rejected
5. **ของฉัน (`/me`)** — ประวัติออเดอร์/การจ่ายย้อนหลัง

### Admin
6. **Admin home (`/admin`)** — รายการสัปดาห์ + ปุ่มสร้างใหม่ + สถานะรอบ
7. **แพลนเมนู (`/admin/menus`)** — **ปฏิทินรายเดือน** (จ–ศ): กดวัน → ชื่อเมนู + คนเลือก (`proposed_by`) + รูป + toggle วันหยุด; ปุ่ม print/share ปฏิทิน
7b. **จัดการรอบบิล (`/admin/week/[weekId]`)** — ตั้งราคา/วัน + deadline (พฤหัส), เปลี่ยนสถานะ draft→open→closed→billed
8. **คิวชำระเงิน (`/admin/payments/[weekId]`)** — **ช่อง Search ค้นหารายชื่อ** (sticky บนสุด) + list รอตรวจ + ดูสลิป (signed URL) + ปุ่มยืนยัน/ปฏิเสธ(เหตุผล); สรุปจ่ายแล้ว/ค้าง/ยอดรวม
9. **สรุป (`/admin/summary/[weekId]`)** — 2 แท็บ:
   - **ตาราง (Order Grid):** สมาชิกทุกคน × จ–ศ, ช่อง = ชนิดไข่ / "ไม่ทานไข่" / "ไม่กิน" (มีสีแยกสถานะ, ไฮไลต์คนไม่กินทั้งสัปดาห์), sticky header + ชื่อคอลัมน์/แถวค้าง, **ปุ่ม print/export รูป + คัดลอก** — ให้ตรงกับที่โพสต์ในกลุ่ม
   - **ยอดนับรายวัน (Cook):** เลือกวัน → **Search ชื่อ** + นับไข่แต่ละชนิด (แยกดาวสุก/ไม่สุก) + หัวรวม + note พิเศษ + **รายชื่อคนที่ยังไม่สั่ง** + คัดลอกข้อความ

## 4. Interaction & micro-states

- เลือกไข่: ปุ่มแบบ segmented มีไอคอน + ฟีดแบ็คทันที (haptic-like color fill)
- สถานะจ่ายเงินใช้สี: เทา=ยังไม่แจ้ง, เหลือง=รอตรวจ, เขียว(leaf)=ยืนยัน, แดง(chili)=ปฏิเสธ
- **Search input:** ไอคอนแว่นขยายนำหน้า, placeholder "ค้นหาชื่อ…", ปุ่มล้าง (×), debounce ~250ms,
  ค้นแบบไม่สนตัวพิมพ์เล็ก/ใหญ่และข้ามช่องว่าง (match `display_name`); แสดง empty state
  "ไม่พบ "<คำค้น>"" เมื่อไม่เจอ; ทำงานร่วมกับตัวกรองสถานะที่มีอยู่ (search + filter ซ้อนกันได้)
- Empty states มีคำแนะนำ ("ยังไม่มีแพลนสัปดาห์นี้ — รอแอดมินเปิดรับ")
- Loading: skeleton การ์ดวัน (ไม่ใช้ spinner เต็มจอหลัง auth)
- ใช้ motion พอดี ๆ (reveal การ์ด, ติ๊กเลือก) — เลี่ยง animation เยอะจนดู AI-generated

## 5. Accessibility

- Touch target ≥ 44×44px; ระยะห่างปุ่มพอ
- Contrast ≥ WCAG AA (ตรวจ yolk/leaf/chili บน paper/ink)
- รองรับ font scaling ของระบบ; label ภาษาไทยชัด, มี aria-label ที่ไอคอน
- ฟอร์มมี error ที่อ่านออก (ไม่ใช้สีอย่างเดียวสื่อสถานะ)

## 6. Performance

- Mobile-first, RSC เป็นหลัก, ลด client JS
- `next/image` + ย่อรูปสลิป/เมนู, lazy load รูปนอกจอ
- signed URL ของสลิปโหลด on-demand ตอนแอดมินเปิดดูเท่านั้น
- ใช้สกิล `site-audit` ตรวจ UX/accessibility/perf หลังมี prototype
- ใช้สกิล `webapp-testing` (Playwright) ทำ E2E ของ flow หลัก

## 7. ขั้นตอนทำงานด้านดีไซน์ (แนะนำ)

1. ร่าง design tokens + 2–3 ตัวเลือกทิศทางใน Figma → วิจารณ์กับ brief (เลี่ยง default)
2. ทำ asset ไข่/ไอคอน/ภาพประกอบใน Canva/Figma
3. ทำ component library (ปุ่มเลือกไข่, การ์ดวัน, payment status chip) ใน Figma → map กับโค้ดด้วย Code Connect
4. Build → `site-audit` → ปรับ → `webapp-testing`
