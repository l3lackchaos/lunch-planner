import { getCurrentUser } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { thaiMonthYear } from "@/lib/date";
import { AppBar, Card, EmptyState } from "@/components/ui";
import type {
  CandidateVoteCountRow,
  MenuCandidateRow,
  VoteRoundRow,
  VoteRow,
} from "@/lib/db/types";
import VoteList from "./VoteList";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const user = await getCurrentUser();
  const sb = await createServerClient();

  const { data: round } = await sb
    .from("vote_rounds")
    .select("*")
    .eq("status", "open")
    .order("target_month", { ascending: false })
    .limit(1)
    .maybeSingle<VoteRoundRow>();

  if (!round) {
    return (
      <>
        <AppBar title="โหวตเมนูเดือนหน้า" />
        <div className="px-4 py-6">
          <EmptyState
            title="ยังไม่มีรอบโหวต"
            description="รออ้อย/แอดมินเปิดโหวตเมนูของเดือนหน้า (ประมาณวันที่ 16) นะคะ"
          />
        </div>
      </>
    );
  }

  const [{ data: candidates }, { data: counts }] = await Promise.all([
    sb.from("menu_candidates").select("*").eq("round_id", round.id).order("created_at"),
    sb.from("candidate_vote_counts").select("*").eq("round_id", round.id),
  ]);

  let myVoted = new Set<string>();
  if (user) {
    const { data: mine } = await sb
      .from("votes")
      .select("candidate_id")
      .eq("round_id", round.id)
      .eq("user_id", user.id);
    myVoted = new Set(((mine ?? []) as Pick<VoteRow, "candidate_id">[]).map((v) => v.candidate_id));
  }

  const countById = new Map(
    ((counts ?? []) as CandidateVoteCountRow[]).map((c) => [c.candidate_id, c.votes]),
  );

  const items = ((candidates ?? []) as MenuCandidateRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    votes: countById.get(c.id) ?? 0,
    voted: myVoted.has(c.id),
  }));

  return (
    <>
      <AppBar title="โหวตเมนูเดือนหน้า" />
      <div className="px-4 py-4">
        <Card className="mb-4 p-4">
          <p className="text-sm text-muted">เมนูสำหรับ</p>
          <p className="text-lg font-bold text-ink">{thaiMonthYear(round.target_month)}</p>
          <p className="mt-1 text-xs text-muted">
            แตะเพื่อโหวตเมนูที่อยากกิน เลือกได้หลายอย่าง · กดซ้ำเพื่อยกเลิก
          </p>
        </Card>

        {items.length === 0 ? (
          <EmptyState title="ยังไม่มีตัวเลือกเมนู" description="รอแอดมินเพิ่มเมนูให้โหวตค่ะ" />
        ) : (
          <VoteList roundId={round.id} items={items} canVote={Boolean(user)} />
        )}
      </div>
    </>
  );
}
