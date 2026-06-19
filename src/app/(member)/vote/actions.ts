"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Member voting actions (ADR-0011). Approval voting: toggle a vote for a candidate
 * while the round is 'open'. RLS is the backstop (own vote + round open).
 */

const toggleSchema = z.object({
  roundId: z.string().uuid(),
  candidateId: z.string().uuid(),
  voted: z.boolean(), // desired state after the toggle
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function toggleVote(input: unknown): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const sb = await createServerClient();
  const { roundId, candidateId, voted } = parsed.data;

  if (voted) {
    // Idempotent insert (unique candidate_id,user_id). Ignore duplicate.
    const { error } = await sb
      .from("votes")
      .upsert(
        { round_id: roundId, candidate_id: candidateId, user_id: user.id },
        { onConflict: "candidate_id,user_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: "โหวตไม่สำเร็จ (รอบอาจปิดแล้ว)" };
  } else {
    const { error } = await sb
      .from("votes")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "ยกเลิกโหวตไม่สำเร็จ" };
  }

  revalidatePath("/vote");
  return { ok: true };
}
