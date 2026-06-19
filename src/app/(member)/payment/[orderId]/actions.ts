"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { calcAmount } from "@/lib/money";
import type { OrderRow, PaymentRow, WeekPlanRow } from "@/lib/db/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const baseSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["slip", "cash"]),
});

export type SubmitPaymentResult = { ok: true } | { ok: false; error: string };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function submitPayment(
  form: FormData,
): Promise<SubmitPaymentResult> {
  const parsed = baseSchema.safeParse({
    orderId: form.get("orderId"),
    method: form.get("method"),
  });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลการชำระไม่ถูกต้อง" };
  }
  const { orderId, method } = parsed.data;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const sb = await createServerClient();

  // Ownership + amount are recomputed server-side (never trust the client).
  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (!order || order.user_id !== user.id) {
    return { ok: false, error: "ไม่พบออเดอร์" };
  }

  const { data: weekPlan } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", order.week_plan_id)
    .maybeSingle<WeekPlanRow>();
  if (!weekPlan) return { ok: false, error: "ไม่พบสัปดาห์นี้" };

  const { count } = await sb
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const orderedDays = count ?? 0;
  if (orderedDays === 0) {
    return { ok: false, error: "ยังไม่มีออเดอร์ ไม่สามารถแจ้งชำระได้" };
  }
  const amount = calcAmount(orderedDays, weekPlan.price_per_day);

  // Guard against duplicate submits: the latest payment must not already be
  // pending or confirmed (rejected → a re-submit inserts a NEW row, ADR-0009).
  const { data: latestRaw } = await sb
    .from("payments")
    .select("status,submitted_at")
    .eq("order_id", order.id)
    .order("submitted_at", { ascending: false })
    .limit(1);
  const latest =
    ((latestRaw ?? [])[0] as Pick<PaymentRow, "status"> | undefined) ?? null;
  if (latest && (latest.status === "pending" || latest.status === "confirmed")) {
    return {
      ok: false,
      error:
        latest.status === "pending"
          ? "มีคำขอที่รอตรวจอยู่แล้ว"
          : "ยืนยันการชำระเงินแล้ว",
    };
  }

  let slipPath: string | null = null;

  if (method === "slip") {
    const slip = form.get("slip");
    if (!(slip instanceof File) || slip.size === 0) {
      return { ok: false, error: "กรุณาแนบรูปสลิป" };
    }
    if (!ACCEPTED.includes(slip.type)) {
      return { ok: false, error: "รองรับเฉพาะไฟล์รูปภาพ" };
    }
    if (slip.size > MAX_BYTES) {
      return { ok: false, error: "ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)" };
    }
    const ext = EXT[slip.type] ?? "jpg";
    // Path convention: slips/{user_id}/{order_id}/{filename}
    const path = `${user.id}/${order.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from("slips")
      .upload(path, slip, { contentType: slip.type, upsert: false });
    if (upErr) {
      return { ok: false, error: "อัปโหลดสลิปไม่สำเร็จ" };
    }
    slipPath = path;
  }

  // Append-only insert (ADR-0009): always a new 'pending' row.
  const { error: insErr } = await sb.from("payments").insert({
    order_id: order.id,
    amount,
    method,
    slip_path: slipPath,
    status: "pending",
  });
  if (insErr) {
    return { ok: false, error: "บันทึกการแจ้งชำระไม่สำเร็จ" };
  }

  revalidatePath("/");
  revalidatePath(`/payment/${order.id}`);
  revalidatePath("/me");

  return { ok: true };
}
