"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import type {
  MenuRow,
  OrderItemRow,
  PaymentRow,
  WeekPlanRow,
} from "@/lib/db/types";

const itemSchema = z.object({
  weekday: z.number().int().min(1).max(5),
  menuDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  egg: z.enum(["boiled", "fried", "omelette", "none"]),
  doneness: z.enum(["well", "soft"]).nullable(),
  note: z.string().max(120).nullable(),
});

const saveOrderSchema = z.object({
  weekId: z.string().uuid(),
  items: z.array(itemSchema).max(5),
});

export type SaveOrderInput = z.infer<typeof saveOrderSchema>;

export type SaveOrderResult = { ok: true } | { ok: false; error: string };

export async function saveOrder(
  input: SaveOrderInput,
): Promise<SaveOrderResult> {
  const parsed = saveOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลออเดอร์ไม่ถูกต้อง" };
  }
  const { weekId, items } = parsed.data;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const sb = await createServerClient();

  // Load the week plan and gate on status='open' (defense in depth; RLS also enforces).
  const { data: weekPlan } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", weekId)
    .maybeSingle<WeekPlanRow>();
  if (!weekPlan) return { ok: false, error: "ไม่พบสัปดาห์นี้" };
  if (weekPlan.status !== "open") {
    return { ok: false, error: "สัปดาห์นี้ปิดรับออเดอร์แล้ว" };
  }

  // Holidays are not selectable (ADR-0004): drop any item that falls on a holiday.
  const { data: menusRaw } = await sb
    .from("menus")
    .select("menu_date,is_holiday")
    .in(
      "menu_date",
      items.map((i) => i.menuDate),
    );
  const holidayDates = new Set(
    ((menusRaw ?? []) as Pick<MenuRow, "menu_date" | "is_holiday">[])
      .filter((m) => m.is_holiday)
      .map((m) => m.menu_date),
  );
  const eatingItems = items.filter((i) => !holidayDates.has(i.menuDate));

  // Find or create the single order for this (week, member).
  const { data: existingOrder } = await sb
    .from("orders")
    .select("id")
    .eq("week_plan_id", weekId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  let orderId = existingOrder?.id ?? null;

  if (orderId) {
    // Lock check (ADR-0010): block edits once the latest payment is confirmed.
    const { data: paymentsRaw } = await sb
      .from("payments")
      .select("status,submitted_at")
      .eq("order_id", orderId)
      .order("submitted_at", { ascending: false })
      .limit(1);
    const latest = ((paymentsRaw ?? [])[0] as Pick<PaymentRow, "status"> | undefined) ?? null;
    if (latest?.status === "confirmed") {
      return {
        ok: false,
        error: "ยืนยันการชำระเงินแล้ว — แก้ออเดอร์ไม่ได้",
      };
    }
  } else {
    const { data: created, error: createErr } = await sb
      .from("orders")
      .insert({ week_plan_id: weekId, user_id: user.id })
      .select("id")
      .single<{ id: string }>();
    if (createErr || !created) {
      return { ok: false, error: "บันทึกออเดอร์ไม่สำเร็จ" };
    }
    orderId = created.id;
  }

  // Reconcile order_items against the desired set.
  // "ไม่กิน" => no row for that weekday (delete it). egg='none' => row stays (ไม่ทานไข่).
  const { data: currentItemsRaw } = await sb
    .from("order_items")
    .select("id,weekday")
    .eq("order_id", orderId);
  const currentItems = (currentItemsRaw ?? []) as Pick<
    OrderItemRow,
    "id" | "weekday"
  >[];

  const desiredWeekdays = new Set(eatingItems.map((i) => i.weekday));
  const toDelete = currentItems
    .filter((it) => !desiredWeekdays.has(it.weekday))
    .map((it) => it.id);

  if (toDelete.length > 0) {
    const { error: delErr } = await sb
      .from("order_items")
      .delete()
      .in("id", toDelete);
    if (delErr) return { ok: false, error: "บันทึกออเดอร์ไม่สำเร็จ" };
  }

  if (eatingItems.length > 0) {
    const rows = eatingItems.map((i) => ({
      order_id: orderId,
      weekday: i.weekday,
      menu_date: i.menuDate,
      egg: i.egg,
      doneness: i.egg === "boiled" || i.egg === "fried" ? i.doneness : null,
      note: i.note,
    }));
    // Upsert on the (order_id, weekday) unique constraint.
    const { error: upErr } = await sb
      .from("order_items")
      .upsert(rows, { onConflict: "order_id,weekday" });
    if (upErr) return { ok: false, error: "บันทึกออเดอร์ไม่สำเร็จ" };
  }

  // Touch updated_at on the order.
  await sb
    .from("orders")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath("/");
  revalidatePath(`/order/${weekId}`);
  if (orderId) revalidatePath(`/payment/${orderId}`);

  return { ok: true };
}
