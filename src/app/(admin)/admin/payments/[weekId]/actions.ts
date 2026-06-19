"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { PaymentRow } from "@/lib/db/types";

/**
 * Confirm/reject the CURRENT (latest) payment of an order.
 *
 * Payments are append-only (ADR-0009): the latest row by `submitted_at` is the
 * current one. The admin action re-resolves that latest row server-side (never
 * trusts a client-passed payment id blindly) and only mutates it when it is
 * still `pending` — guarding against acting on a stale row after a member has
 * re-submitted. Only admins may confirm/reject (RLS + guard).
 */

const confirmSchema = z.object({
  orderId: z.string().uuid(),
  weekId: z.string().uuid(),
});

const rejectSchema = confirmSchema.extend({
  reason: z.string().trim().min(1, "ต้องระบุเหตุผลในการปฏิเสธ").max(500),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Resolve the latest payment row for an order (append-only current row). */
async function latestPayment(
  sb: Awaited<ReturnType<typeof createServerClient>>,
  orderId: string,
): Promise<PaymentRow | null> {
  const { data, error } = await sb
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<PaymentRow>();
  if (error) throw error;
  return data ?? null;
}

export async function confirmPayment(input: unknown): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const admin = await requireAdmin();
  const sb = await createServerClient();

  const latest = await latestPayment(sb, parsed.data.orderId);
  if (!latest) return { ok: false, error: "ไม่พบรายการชำระเงิน" };
  if (latest.status !== "pending") {
    return { ok: false, error: "รายการนี้ถูกดำเนินการไปแล้ว" };
  }

  const { error } = await sb
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_by: admin.id,
      confirmed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", latest.id)
    .eq("status", "pending"); // optimistic guard: only flip a still-pending row
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/payments/${parsed.data.weekId}`);
  return { ok: true };
}

export async function rejectPayment(input: unknown): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const admin = await requireAdmin();
  const sb = await createServerClient();

  const latest = await latestPayment(sb, parsed.data.orderId);
  if (!latest) return { ok: false, error: "ไม่พบรายการชำระเงิน" };
  if (latest.status !== "pending") {
    return { ok: false, error: "รายการนี้ถูกดำเนินการไปแล้ว" };
  }

  const { error } = await sb
    .from("payments")
    .update({
      status: "rejected",
      confirmed_by: admin.id,
      confirmed_at: new Date().toISOString(),
      reject_reason: parsed.data.reason,
    })
    .eq("id", latest.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/payments/${parsed.data.weekId}`);
  return { ok: true };
}

export type SlipUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Create a short-lived signed URL for a private slip image (admins read all). */
export async function getSlipUrl(slipPath: string): Promise<SlipUrlResult> {
  if (!slipPath) return { ok: false, error: "ไม่มีสลิป" };
  await requireAdmin();
  const sb = await createServerClient();
  const { data, error } = await sb.storage.from("slips").createSignedUrl(slipPath, 60);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? "เปิดสลิปไม่สำเร็จ" };
  }
  return { ok: true, url: data.signedUrl };
}
