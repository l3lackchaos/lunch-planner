"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { WeekPlanRow } from "@/lib/db/types";
import {
  deadlineThursdayBefore,
  fromDateStr,
  mondayOf,
  toDateStr,
} from "@/lib/date";

/**
 * Create a new Week Plan (T1.1, ADR-0007).
 * Defaults week_start to next Monday; guards duplicate week_start; computes the
 * pre-pay deadline (Thursday before week_start). Redirects to the manage page.
 */
export async function createWeekPlanAction(formData: FormData) {
  const admin = await requireAdmin();
  const sb = await createServerClient();

  // Optional explicit week_start (Monday); otherwise default to next Monday.
  const raw = formData.get("week_start");
  let weekStart: string;
  if (typeof raw === "string" && raw.length > 0) {
    weekStart = toDateStr(mondayOf(fromDateStr(raw)));
  } else {
    const nextMonday = mondayOf(fromDateStr(toDateStr(new Date())));
    nextMonday.setDate(nextMonday.getDate() + 7);
    weekStart = toDateStr(nextMonday);
  }

  // Guard duplicate week_start (also enforced by a unique constraint in DB).
  const { data: existing } = await sb
    .from("week_plans")
    .select("id")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) {
    redirect(`/admin/week/${(existing as { id: string }).id}`);
  }

  const deadline = deadlineThursdayBefore(weekStart).toISOString();
  const { data, error } = await sb
    .from("week_plans")
    .insert({
      week_start: weekStart,
      status: "draft",
      price_per_day: 20,
      order_deadline: deadline,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`สร้างสัปดาห์ไม่สำเร็จ: ${error.message}`);
  }

  revalidatePath("/admin");
  redirect(`/admin/week/${(data as { id: string }).id}`);
}

const updateSchema = z.object({
  weekId: z.string().uuid(),
  pricePerDay: z.coerce.number().int().min(0).max(1000),
  note: z.string().trim().max(500).optional().default(""),
});

/** Update price_per_day + note for a Week Plan (T1.1). */
export async function updateWeekPlanAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = updateSchema.safeParse({
    weekId: formData.get("weekId"),
    pricePerDay: formData.get("pricePerDay"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    throw new Error("ข้อมูลไม่ถูกต้อง");
  }
  const { weekId, pricePerDay, note } = parsed.data;

  const { error } = await sb
    .from("week_plans")
    .update({ price_per_day: pricePerDay, note: note || null })
    .eq("id", weekId);
  if (error) throw new Error(`บันทึกไม่สำเร็จ: ${error.message}`);

  revalidatePath(`/admin/week/${weekId}`);
  revalidatePath("/admin");
}

// Allowed forward transitions draft→open→closed→billed (+ reopen back one step).
const STATUS_ORDER = ["draft", "open", "closed", "billed"] as const;
type WeekStatus = (typeof STATUS_ORDER)[number];

const statusSchema = z.object({
  weekId: z.string().uuid(),
  next: z.enum(STATUS_ORDER),
});

/** Advance/step-back the Week Plan status (T1.1). */
export async function setWeekStatusAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = statusSchema.safeParse({
    weekId: formData.get("weekId"),
    next: formData.get("next"),
  });
  if (!parsed.success) throw new Error("สถานะไม่ถูกต้อง");
  const { weekId, next } = parsed.data;

  const { data: current } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", weekId)
    .single();
  if (!current) throw new Error("ไม่พบสัปดาห์นี้");
  const row = current as WeekPlanRow;

  const curIdx = STATUS_ORDER.indexOf(row.status as WeekStatus);
  const nextIdx = STATUS_ORDER.indexOf(next);
  // Allow only single-step forward or single-step backward (reopen).
  if (Math.abs(nextIdx - curIdx) !== 1) {
    throw new Error("เปลี่ยนสถานะข้ามขั้นไม่ได้");
  }

  const { error } = await sb
    .from("week_plans")
    .update({ status: next })
    .eq("id", weekId);
  if (error) throw new Error(`เปลี่ยนสถานะไม่สำเร็จ: ${error.message}`);

  revalidatePath(`/admin/week/${weekId}`);
  revalidatePath("/admin");
}
