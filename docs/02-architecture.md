# 02 — Architecture

## 1. ภาพรวม

```
┌──────────────────────────────────────────────────────────┐
│                  LINE App (กลุ่มแชต)                       │
│   พิมพ์ /สั่ง → กดลิงก์ LIFF                                │
└───────────────────────────┬──────────────────────────────┘
                            │ เปิดใน LINE in-app browser
                            ▼
┌──────────────────────────────────────────────────────────┐
│              Next.js (App Router) บน Vercel                │
│  - LIFF SDK init (@line/liff) ฝั่ง client                 │
│  - React Server Components + Server Actions / Route Handlers│
│  - ตรวจ LINE ID token → ออก Supabase session (custom JWT)  │
└───────────────┬───────────────────────────┬──────────────┘
                │ verify ID token            │ DB / Storage
                ▼                            ▼
   ┌────────────────────────┐   ┌──────────────────────────┐
   │  LINE Platform          │   │  Supabase                 │
   │  - LINE Login / Verify   │   │  - Postgres (+ RLS)       │
   │  - (later) Messaging API │   │  - Auth (custom JWT)      │
   └────────────────────────┘   │  - Storage: bucket "slips"│
                                 └──────────────────────────┘
```

## 2. Frontend (Next.js)

- **App Router + TypeScript + Tailwind CSS**
- โครงหน้า (route groups):
  - `(member)` — `/` (สัปดาห์นี้), `/order/[weekId]`, `/payment/[orderId]`, `/me`
  - `(admin)` — `/admin`, `/admin/week/[weekId]`, `/admin/payments/[weekId]`, `/admin/summary/[weekId]`
- **LIFF init:** ใน client component ระดับบนสุด เรียก `liff.init({ liffId })`;
  ถ้ายังไม่ล็อกอิน → `liff.login()`. ดึง `liff.getIDToken()` ส่งไป backend
- **Data fetching:** ใช้ RSC + Server Actions เป็นหลัก (ลด JS ฝั่ง client → โหลดเร็วในเว็บวิว)
- **State:** form state ฝั่ง client เท่าที่จำเป็น (ตัวเลือกไข่/วัน), ที่เหลือ server-driven

## 3. Authentication & Authorization

**หลักการ: อย่าเชื่อ client.** ตรวจตัวตนฝั่ง server เสมอ

1. Client (LIFF) ได้ **LINE ID token** จาก `liff.getIDToken()`
2. ส่งไปยัง Next.js route handler `/api/auth/line`
3. Server verify ID token กับ LINE (`https://api.line.me/oauth2/v2.1/verify`)
   ตรวจ `aud` = LINE Login channel ID, `exp`, signature
4. ได้ `sub` (LINE userId), `name`, `picture` → upsert ลงตาราง `users`
5. **ออก Supabase-compatible JWT** (เซ็นด้วย Supabase JWT secret) โดยใส่
   `sub = users.id`, custom claim `line_user_id`, `role` → ตั้งเป็น Supabase session
   → ทำให้ **RLS** ทำงานตาม `auth.uid()` ได้
6. Authorization เชิงสิทธิ์ (admin/cook) บังคับทั้งใน RLS policy และใน server action

> ทางเลือกที่ง่ายกว่า (MVP เร่งด่วน): ให้ Next.js server ถือ **service role key**
> แล้วบังคับ authz ในโค้ดเอง (ไม่พึ่ง RLS). **ไม่แนะนำ** เพราะเสี่ยงพลาด — ใช้ custom JWT + RLS ดีกว่า

## 4. Storage (รูปสลิป)

- Bucket `slips` แบบ **private**
- อัปโหลดผ่าน server action (ตรวจ type/size, ย่อรูปก่อนเก็บถ้าจำเป็น)
- เข้าถึงรูปผ่าน **signed URL** อายุสั้น เฉพาะเจ้าของออเดอร์ + admin
- จำกัด: รูปภาพเท่านั้น (jpg/png/webp/heic), ขนาด ≤ ~8MB, แปลง/บีบอัด

## 5. Deployment (Vercel)

- เชื่อม repo → auto deploy ต่อ branch (preview) + production
- **Environment variables:**
  - `NEXT_PUBLIC_LIFF_ID`
  - `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only), `SUPABASE_JWT_SECRET`
  - `ADMIN_LINE_USER_IDS` (seed แอดมินคนแรก)
  - *(later)* `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`
- LIFF endpoint URL ตั้งให้ชี้ production URL (และ preview สำหรับทดสอบ)

## 6. LINE Setup (ต้องทำใน LINE Developers Console)

1. สร้าง **LINE Login channel** → ได้ channel ID/secret → ใช้ตรวจ ID token
2. เพิ่ม **LIFF app** ใต้ channel → ได้ `LIFF_ID`, ตั้ง endpoint URL, scope = `profile openid`
3. *(Phase 5/later)* **Messaging API channel** สำหรับ push แจ้งเตือน (เปิดรับสั่ง/เตือนจ่ายเงินพฤหัส/ยืนยันแล้ว)

## 7. Performance budget (เป้าหมาย)

- LIFF ready < ~1.5s บน 4G mid-tier phone
- หน้าหลัก JS payload เล็ก (พึ่ง RSC), รูปผ่าน `next/image`
- รูปสลิป: ย่อ + lazy load + signed URL on-demand
- หลีกเลี่ยง client library หนัก ๆ; เลือก dependency เท่าที่จำเป็น

## 8. Testing & QA

- **Unit:** logic คำนวณยอดเงิน, สรุปนับไข่, สิทธิ์
- **E2E:** ใช้ Playwright (สกิล `webapp-testing`) จำลอง flow สั่ง→จ่าย→ยืนยัน
- ทดสอบ LIFF จริงผ่าน LINE app + LIFF inspector
- ตรวจ RLS: ผู้ใช้ A เปิดข้อมูลของ B ไม่ได้
