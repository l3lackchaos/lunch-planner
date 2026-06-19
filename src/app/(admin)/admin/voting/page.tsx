import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { thaiMonthYear, nextMonthFirst } from "@/lib/date";
import { Button, Card, EmptyState } from "@/components/ui";
import type { VoteRoundRow } from "@/lib/db/types";
import { createRound } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<VoteRoundRow["status"], string> = {
  draft: "ร่าง",
  open: "เปิดโหวต",
  closed: "ปิดแล้ว",
};

export default async function VotingHome() {
  await requireAdmin();
  const sb = await createServerClient();
  const { data: rounds } = await sb
    .from("vote_rounds")
    .select("*")
    .order("target_month", { ascending: false });

  const list = (rounds ?? []) as VoteRoundRow[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-ink">โหวตเมนูประจำเดือน</h1>

      <Card className="p-4">
        <form action={createRound} className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">เปิดรอบโหวตใหม่</p>
          <label className="text-xs text-muted">
            เดือนเป้าหมาย
            <input
              type="date"
              name="target_month"
              defaultValue={nextMonthFirst()}
              className="mt-1 block w-full rounded-card border border-border bg-card px-3 py-2 text-ink"
            />
          </label>
          <input
            type="text"
            name="title"
            placeholder="ชื่อรอบ (ไม่บังคับ)"
            className="rounded-card border border-border bg-card px-3 py-2 text-ink"
          />
          <Button type="submit">สร้างรอบโหวต</Button>
        </form>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="ยังไม่มีรอบโหวต" description="สร้างรอบแรกด้านบนได้เลย" />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/voting/${r.id}`}>
                <Card className="flex items-center justify-between p-3 hover:bg-paper">
                  <div>
                    <p className="font-medium text-ink">{thaiMonthYear(r.target_month)}</p>
                    {r.title && <p className="text-xs text-muted">{r.title}</p>}
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
                    {STATUS_LABEL[r.status]}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
