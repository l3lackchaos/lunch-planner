"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Upsert a Menu for one calendar date (T1.2, ADR-0004).
 *
 * Proposer is hybrid: pick a Member (proposed_by_user_id) OR type a free name
 * (proposed_by_name). A non-holiday day needs a proposer one way or another
 * (DB check constraint menus_proposer_or_holiday_chk).
 */
const saveSchema = z
  .object({
    menuDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
    name: z.string().trim().max(120).optional().default(""),
    description: z.string().trim().max(500).optional().default(""),
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .default("")
      .refine((v) => v === "" || /^https?:\/\//.test(v), "ลิงก์รูปไม่ถูกต้อง"),
    proposedByUserId: z.string().uuid().optional().or(z.literal("")).default(""),
    proposedByName: z.string().trim().max(80).optional().default(""),
    isHoliday: z.coerce.boolean().default(false),
  })
  .refine(
    (v) =>
      v.isHoliday ||
      (v.proposedByUserId && v.proposedByUserId.length > 0) ||
      (v.proposedByName && v.proposedByName.length > 0),
    { message: "วันที่ไม่ใช่วันหยุดต้องระบุคนเลือก (เลือกสมาชิกหรือพิมพ์ชื่อ)" },
  );

export async function saveMenuAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = saveSchema.safeParse({
    menuDate: formData.get("menuDate"),
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    proposedByUserId: formData.get("proposedByUserId") ?? "",
    proposedByName: formData.get("proposedByName") ?? "",
    isHoliday: formData.get("isHoliday") ?? false,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  }
  const v = parsed.data;

  // Prefer the linked Member; only keep the free-text name when no Member chosen.
  const proposedByUserId = v.isHoliday ? null : v.proposedByUserId || null;
  const proposedByName = v.isHoliday
    ? null
    : proposedByUserId
      ? null
      : v.proposedByName || null;

  const row = {
    menu_date: v.menuDate,
    name: v.isHoliday ? null : v.name || null,
    description: v.isHoliday ? null : v.description || null,
    image_url: v.isHoliday ? null : v.imageUrl || null,
    proposed_by_user_id: proposedByUserId,
    proposed_by_name: proposedByName,
    is_holiday: v.isHoliday,
  };

  // menu_date is unique → upsert on conflict.
  const { error } = await sb.from("menus").upsert(row, { onConflict: "menu_date" });
  if (error) throw new Error(`บันทึกเมนูไม่สำเร็จ: ${error.message}`);

  revalidatePath("/admin/menus");
  revalidatePath("/admin/menus/print");
}

const clearSchema = z.object({
  menuDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Remove a Menu for a date (clear the day). */
export async function clearMenuAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = clearSchema.safeParse({ menuDate: formData.get("menuDate") });
  if (!parsed.success) throw new Error("วันที่ไม่ถูกต้อง");

  const { error } = await sb.from("menus").delete().eq("menu_date", parsed.data.menuDate);
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  revalidatePath("/admin/menus");
  revalidatePath("/admin/menus/print");
}
