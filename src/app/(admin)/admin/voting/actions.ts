"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { nextMonthFirst } from "@/lib/date";
import type { MenuCandidateRow, VoteRoundRow } from "@/lib/db/types";

/** Admin voting management (ADR-0011). All actions are admin-guarded + zod-validated. */

export type ActionResult = { ok: true } | { ok: false; error: string };

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง");

// ── Rounds ───────────────────────────────────────────────────────────────────
export async function createRound(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = await createServerClient();
  const targetMonth = (formData.get("target_month") as string) || nextMonthFirst();
  const title = ((formData.get("title") as string) || "").trim() || null;

  const parsed = dateStr.safeParse(targetMonth);
  if (!parsed.success) return;

  const { data: existing } = await sb
    .from("vote_rounds")
    .select("id")
    .eq("target_month", parsed.data)
    .maybeSingle<Pick<VoteRoundRow, "id">>();

  if (existing) {
    redirect(`/admin/voting/${existing.id}`);
  }

  const { data: created } = await sb
    .from("vote_rounds")
    .insert({ target_month: parsed.data, title, status: "draft" })
    .select("id")
    .single<Pick<VoteRoundRow, "id">>();

  revalidatePath("/admin/voting");
  if (created) redirect(`/admin/voting/${created.id}`);
}

const statusSchema = z.object({
  roundId: z.string().uuid(),
  status: z.enum(["draft", "open", "closed"]),
});

export async function setRoundStatus(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  await requireAdmin();
  const sb = await createServerClient();

  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "open") patch.opens_at = new Date().toISOString();
  if (parsed.data.status === "closed") patch.closes_at = new Date().toISOString();

  const { error } = await sb.from("vote_rounds").update(patch).eq("id", parsed.data.roundId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/voting/${parsed.data.roundId}`);
  revalidatePath("/admin/voting");
  return { ok: true };
}

// ── Candidates ───────────────────────────────────────────────────────────────
export async function addCandidate(formData: FormData): Promise<void> {
  await requireAdmin();
  const sb = await createServerClient();
  const roundId = z.string().uuid().safeParse(formData.get("round_id"));
  const name = ((formData.get("name") as string) || "").trim();
  if (!roundId.success || name.length === 0) return;

  const description = ((formData.get("description") as string) || "").trim() || null;
  const proposedByName = ((formData.get("proposed_by_name") as string) || "").trim() || null;

  await sb.from("menu_candidates").insert({
    round_id: roundId.data,
    name,
    description,
    proposed_by_name: proposedByName,
  });
  revalidatePath(`/admin/voting/${roundId.data}`);
}

const deleteSchema = z.object({ id: z.string().uuid(), roundId: z.string().uuid() });

export async function deleteCandidate(input: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  await requireAdmin();
  const sb = await createServerClient();
  const { error } = await sb.from("menu_candidates").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/voting/${parsed.data.roundId}`);
  return { ok: true };
}

// ── Promote a winning candidate into the menu calendar (menus, ADR-0004) ──────
const promoteSchema = z.object({
  candidateId: z.string().uuid(),
  roundId: z.string().uuid(),
  menuDate: dateStr,
});

export async function promoteCandidate(input: unknown): Promise<ActionResult> {
  const parsed = promoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  await requireAdmin();
  const sb = await createServerClient();

  const { data: cand } = await sb
    .from("menu_candidates")
    .select("name, description, proposed_by_user_id, proposed_by_name")
    .eq("id", parsed.data.candidateId)
    .maybeSingle<Pick<MenuCandidateRow, "name" | "description" | "proposed_by_user_id" | "proposed_by_name">>();
  if (!cand) return { ok: false, error: "ไม่พบเมนู" };

  const { error } = await sb.from("menus").upsert(
    {
      menu_date: parsed.data.menuDate,
      name: cand.name,
      description: cand.description,
      proposed_by_user_id: cand.proposed_by_user_id,
      proposed_by_name: cand.proposed_by_name ?? "จากโหวต",
      is_holiday: false,
    },
    { onConflict: "menu_date" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/voting/${parsed.data.roundId}`);
  revalidatePath("/admin/menus");
  return { ok: true };
}
