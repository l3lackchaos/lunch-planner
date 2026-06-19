"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Add a roster Member (T1.0, ADR-0008): display_name only, no LINE account yet
 * (line_user_id null, created_by_admin true). The LINE account is linked later
 * on first login (claim).
 */
const addSchema = z.object({
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80),
});

export async function addRosterMemberAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = addSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  }

  const { error } = await sb.from("users").insert({
    display_name: parsed.data.displayName,
    line_user_id: null,
    role: "member",
    is_active: true,
    created_by_admin: true,
  });
  if (error) throw new Error(`เพิ่มสมาชิกไม่สำเร็จ: ${error.message}`);

  revalidatePath("/admin/roster");
}

const toggleSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.coerce.boolean(),
});

/** Toggle is_active for a Member (hide ex-members from summaries). */
export async function toggleActiveAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = toggleSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) throw new Error("ข้อมูลไม่ถูกต้อง");

  const { error } = await sb
    .from("users")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.userId);
  if (error) throw new Error(`อัปเดตไม่สำเร็จ: ${error.message}`);

  revalidatePath("/admin/roster");
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["member", "cook", "admin"]),
});

/** Change a Member's role (member/cook/admin). */
export async function setRoleAction(formData: FormData) {
  await requireAdmin();
  const sb = await createServerClient();

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error("บทบาทไม่ถูกต้อง");

  const { error } = await sb
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);
  if (error) throw new Error(`เปลี่ยนบทบาทไม่สำเร็จ: ${error.message}`);

  revalidatePath("/admin/roster");
}
