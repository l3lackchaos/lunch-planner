import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { thaiMonthYear } from "@/lib/date";
import { Button, Card } from "@/components/ui";
import type {
  CandidateVoteCountRow,
  MenuCandidateRow,
  VoteRoundRow,
} from "@/lib/db/types";
import { addCandidate } from "../actions";
import RoundAdmin from "./RoundAdmin";

export const dynamic = "force-dynamic";

export default async function RoundDetail({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  await requireAdmin();
  const { roundId } = await params;
  const sb = await createServerClient();

  const { data: round } = await sb
    .from("vote_rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle<VoteRoundRow>();
  if (!round) notFound();

  const [{ data: candidates }, { data: counts }] = await Promise.all([
    sb.from("menu_candidates").select("*").eq("round_id", roundId).order("created_at"),
    sb.from("candidate_vote_counts").select("*").eq("round_id", roundId),
  ]);

  const countById = new Map(
    ((counts ?? []) as CandidateVoteCountRow[]).map((c) => [c.candidate_id, c.votes]),
  );
  const ranked = ((candidates ?? []) as MenuCandidateRow[])
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      votes: countById.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">โหวตเมนู — {thaiMonthYear(round.target_month)}</h1>
        {round.title && <p className="text-sm text-muted">{round.title}</p>}
      </div>

      <RoundAdmin roundId={round.id} status={round.status} targetMonth={round.target_month} ranked={ranked} />

      <Card className="p-4">
        <form action={addCandidate} className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">เพิ่มเมนูตัวเลือก</p>
          <input type="hidden" name="round_id" value={round.id} />
          <input
            type="text"
            name="name"
            required
            placeholder="ชื่อเมนู เช่น ข้าวขาหมู"
            className="rounded-card border border-border bg-card px-3 py-2 text-ink"
          />
          <input
            type="text"
            name="description"
            placeholder="รายละเอียด (ไม่บังคับ)"
            className="rounded-card border border-border bg-card px-3 py-2 text-ink"
          />
          <input
            type="text"
            name="proposed_by_name"
            placeholder="คนเสนอ (ไม่บังคับ)"
            className="rounded-card border border-border bg-card px-3 py-2 text-ink"
          />
          <Button type="submit" variant="secondary">เพิ่มเมนู</Button>
        </form>
      </Card>
    </div>
  );
}
