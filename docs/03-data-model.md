# 03 — Data Model (Supabase / Postgres)

> สรุป schema สำหรับ MVP. ใช้ `apply_migration` ของ Supabase ตอนลงมือทำจริง
> ทุกตารางมี `created_at timestamptz default now()`; ใช้ `uuid` เป็น PK (`gen_random_uuid()`)

## 1. Enums

```sql
create type user_role   as enum ('member', 'cook', 'admin');
create type week_status as enum ('draft', 'open', 'closed', 'billed');
create type egg_style   as enum ('boiled', 'fried', 'omelette', 'none');
create type egg_doneness as enum ('well', 'soft');         -- optional ต่อ item
create type pay_method  as enum ('slip', 'cash');
create type pay_status  as enum ('pending', 'confirmed', 'rejected');
```

## 2. Tables

### users
| column | type | note |
|--------|------|------|
| id | uuid PK | |
| line_user_id | text unique not null | จาก LINE `sub` |
| display_name | text | |
| picture_url | text | |
| role | user_role default 'member' | |
| created_at | timestamptz | |

### week_plans — รอบบิลรายสัปดาห์ (จ–ศ)
| column | type | note |
|--------|------|------|
| id | uuid PK | |
| week_start | date not null unique | วันจันทร์ของสัปดาห์ |
| status | week_status default 'draft' | draft→open→closed→billed |
| price_per_day | integer not null default 20 | บาท/วัน |
| order_deadline | timestamptz | default = พฤหัสของสัปดาห์นั้น |
| note | text | |
| created_by | uuid → users.id | |

### menus — เมนูรายวัน (ปฏิทินรายเดือน, key = วันที่)
> เปลี่ยนจากผูกกับ week_plan มาเป็น **key ด้วย `menu_date`** เพื่อรองรับการวางแผนเมนู
> ล่วงหน้าเป็นเดือน (ดูภาพปฏิทิน "June 2026") — week_plan (รอบบิล) อ้างอิงช่วงวันที่แทน

| column | type | note |
|--------|------|------|
| id | uuid PK | |
| menu_date | date not null unique | วันจริง (PK เชิงตรรกะ) |
| name | text | ชื่อเมนู |
| description | text | |
| image_url | text | รูปเมนู (optional) |
| proposed_by | text | **ชื่อคนเลือก/รับผิดชอบ** เช่น "พี่อีฟ" (หรือ uuid→users.id ถ้าผูกบัญชี) |
| is_holiday | boolean default false | **วันหยุด** → ไม่มีออเดอร์/ไม่คิดเงิน |

> หมายเหตุ: `weekday` ดึงจาก `menu_date` ได้ (`extract(isodow …)`) ไม่ต้องเก็บซ้ำ

### orders — 1 สมาชิก / 1 สัปดาห์
| column | type | note |
|--------|------|------|
| id | uuid PK | |
| week_plan_id | uuid → week_plans.id (cascade) | |
| user_id | uuid → users.id | |
| created_at / updated_at | timestamptz | |
| unique (week_plan_id, user_id) | | |

### order_items — รายการรายวันของออเดอร์
| column | type | note |
|--------|------|------|
| id | uuid PK | |
| order_id | uuid → orders.id (cascade) | |
| weekday | smallint check (1..5) | |
| menu_date | date not null | |
| egg | egg_style not null default 'none' | ต้ม/ดาว/เจียว/ไม่เอา |
| doneness | egg_doneness | optional (เช่น ไข่ดาวไม่สุก = soft) |
| note | text | เช่น "ไม่ใส่ผัก" |
| unique (order_id, weekday) | | กันสั่งวันซ้ำ |

> จำนวนวันที่สั่ง = จำนวน order_items ของออเดอร์ (รวมที่ egg='none' ด้วย ถือว่ากินวันนั้น)
> ยอดเงิน = COUNT(order_items) × week_plans.price_per_day

### payments — การชำระต่อออเดอร์ (รายสัปดาห์)
| column | type | note |
|--------|------|------|
| id | uuid PK | |
| order_id | uuid → orders.id (cascade) unique | 1 ออเดอร์ 1 payment ล่าสุด |
| amount | integer not null | คำนวณ ณ เวลาแจ้ง |
| method | pay_method not null | slip / cash |
| slip_path | text | path ใน bucket "slips" (เฉพาะ method=slip) |
| status | pay_status default 'pending' | |
| submitted_at | timestamptz default now() | |
| confirmed_by | uuid → users.id | admin ที่กด |
| confirmed_at | timestamptz | |
| reject_reason | text | ถ้า rejected |

### (Phase 6 — deferred) menu_candidates, votes
> สำหรับโหวตเมนูประจำเดือน (~วันที่ 16) — ออกแบบรายละเอียดภายหลัง
> ร่างคร่าว: `vote_rounds(month, status)`, `menu_candidates(round_id, weekday, name)`,
> `votes(candidate_id, user_id, unique(round_id, weekday, user_id))`

## 3. Views / Helpers (สำหรับสรุป)

```sql
-- สรุปนับไข่ต่อวัน (สำหรับแม่ครัว) — แยก doneness (ดาวสุก/ไม่สุก)
create view daily_egg_summary as
select oi.menu_date, oi.egg, oi.doneness, count(*) as qty
from order_items oi
join orders o on o.id = oi.order_id
group by oi.menu_date, oi.egg, oi.doneness;

-- (ก) ตารางสรุปออเดอร์ (Order Grid): สมาชิก "ทุกคน" × ทุกวันในสัปดาห์
-- LEFT JOIN จากรายชื่อ → คนที่ไม่สั่ง = ไม่มี order_item → แสดง 'ไม่กิน'
-- egg='none' → 'ไม่ทานไข่' ; มีไข่ → แสดงชนิด (+doneness)
create view weekly_order_grid as
select u.id as user_id, u.display_name, m.menu_date,
       case
         when oi.id is null then 'ไม่กิน'              -- ไม่มีออเดอร์วันนั้น
         when oi.egg = 'none' then 'ไม่ทานไข่'          -- สั่งข้าว ไม่เอาไข่
         when oi.egg = 'fried' and oi.doneness='soft' then 'ดาวไม่สุก'
         when oi.egg = 'fried' then 'ไข่ดาวสุก'
         when oi.egg = 'boiled' then 'ต้ม'
         when oi.egg = 'omelette' then 'ไข่เจียว'
       end as cell,
       (oi.id is not null) as is_eating
from users u
cross join menus m
left join orders o   on o.user_id = u.id
left join order_items oi on oi.order_id = o.id and oi.menu_date = m.menu_date
where u.role <> 'admin' or true            -- รวมทุกสมาชิก (ปรับด้วย active flag ได้)
  and m.is_holiday = false;
-- ใช้ filter ช่วงวันที่ของสัปดาห์ (week_plans.week_start .. +4) ตอน query

-- (ข) ใครยังไม่สั่งข้าวในวันนั้น
create view daily_not_ordered as
select m.menu_date, u.id as user_id, u.display_name
from menus m
cross join users u
where m.is_holiday = false
  and not exists (
    select 1 from orders o join order_items oi on oi.order_id = o.id
    where o.user_id = u.id and oi.menu_date = m.menu_date
  );

-- สถานะจ่ายเงินต่อสัปดาห์ (สำหรับ admin dashboard)
create view weekly_payment_status as
select wp.id as week_plan_id, o.user_id, u.display_name,
       (select count(*) from order_items oi where oi.order_id = o.id) as days,
       p.amount, p.method, p.status
from week_plans wp
join orders o on o.week_plan_id = wp.id
join users u on u.id = o.user_id
left join payments p on p.order_id = o.id;
```

> **Roster:** ตาราง `users` ทำหน้าที่เป็นรายชื่อสมาชิกของกลุ่ม (ทุกคนที่เคยล็อกอิน)
> ตาราง grid อิงรายชื่อนี้ จึงโชว์คนที่ "ไม่กิน/ไม่สั่ง" ได้ครบ. แนะนำเพิ่ม `users.is_active`
> (boolean) เพื่อกรองคนที่ออกจากกลุ่มออกจากสรุป

## 4. RLS (Row Level Security) — สรุปนโยบาย

เปิด RLS ทุกตาราง. `auth.uid()` = `users.id` (จาก custom JWT). helper:

```sql
create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from users where id = auth.uid() and role = 'admin');
$$;
create or replace function is_cook_or_admin() returns boolean language sql stable as $$
  select exists(select 1 from users where id = auth.uid() and role in ('cook','admin'));
$$;
```

| ตาราง | อ่าน | เขียน |
|-------|------|-------|
| users | ตัวเอง + admin อ่านทั้งหมด | ตัวเอง (โปรไฟล์), admin แก้ role |
| week_plans / daily_menus | ทุกคนที่ล็อกอิน (อ่าน) | admin เท่านั้น |
| orders / order_items | เจ้าของ + admin/cook | เจ้าของ (เฉพาะตอน week.status='open') ; admin |
| payments | เจ้าของ + admin | เจ้าของ insert (pending); ยืนยัน/ปฏิเสธ = admin เท่านั้น |
| storage `slips` | เจ้าของ + admin (ผ่าน signed URL) | เจ้าของ upload |

> การเปลี่ยนสถานะ payment เป็น confirmed/rejected ทำผ่าน server action ที่ตรวจ `is_admin()`
> และบันทึก `confirmed_by/at` หรือ `reject_reason`

## 5. Indexes

- `orders (week_plan_id, user_id)` (unique ครอบอยู่แล้ว)
- `order_items (order_id)`, `order_items (menu_date)`
- `payments (order_id)`, `payments (status)`
- `daily_menus (week_plan_id, weekday)`
