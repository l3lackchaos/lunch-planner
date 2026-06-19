"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { VoteRoundStatus } from "@/lib/db/types";
import { deleteCandidate, promoteCandidate, setRoundStatus } from "../actions";

type Ranked = { id: string; name: string; description: string | null; votes: number };

const STATUS_LABEL: Record<VoteRoundStatus, string> = {
  draft: "ร่าง",
  open: "เปิดโหวต",
  closed: "ปิดแล้ว",
};

export default function RoundAdmin({
  roundId,
  status,
  targetMonth,
  ranked,
}: {
  roundId: string;
  status: VoteRoundStatus;
  targetMonth: string;
  ranked: Ranked[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  // default promote date = first working-ish day of the target month
  const [dates, setDates] = useState<Record<string, string>>({});

  function changeStatus(next: VoteRoundStatus) {
    startTransition(async () => {
      const r = await setRoundStatus({ roundId, status: next });
      setMsg(r.ok ? `อัปเดตสถานะเป็น "${STATUS_LABEL[next]}"` : r.error);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteCandidate({ id, roundId });
      if (!r.ok) setMsg(r.error);
    });
  }

  function promote(id: string) {
    const menuDate = dates[id] || targetMonth;
    startTransition(async () => {
      const r = await promoteCandidate({ candidateId: id, roundId, menuDate });
      setMsg(r.ok ? "เพิ่มลงปฏิทินเมนูแล้ว" : r.error);
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">สถานะ:</span>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink">
          {STATUS_LABEL[status]}
        </span>
        <div className="ml-auto flex gap-2">
          {status !== "open" && (
            <Button size="sm" onClick={() => changeStatus("open")} loading={pending}>
              เปิดโหวต
            </Button>
          )}
          {status === "open" && (
            <Button size="sm" variant="danger" onClick={() => changeStatus("closed")} loading={pending}>
              ปิดโหวต
            </Button>
          )}
          {status === "closed" && (
            <Button size="sm" variant="ghost" onClick={() => changeStatus("open")} loading={pending}>
              เปิดอีกครั้ง
            </Button>
          )}
        </div>
      </div>

      {msg && <p className="text-xs text-leaf">{msg}</p>}

      <div>
        <p className="mb-2 text-sm font-medium text-ink">ผลโหวต (เรียงมากไปน้อย)</p>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีเมนูตัวเลือก</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranked.map((c, i) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-paper p-2"
              >
                <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  {c.description && <p className="truncate text-xs text-muted">{c.description}</p>}
                </div>
                <span className="rounded-full bg-yolk/15 px-2.5 py-1 text-sm font-bold tabular-nums text-yolk-ink">
                  {c.votes}
                </span>
                <input
                  type="date"
                  aria-label={`วันที่จะใส่เมนู ${c.name}`}
                  defaultValue={targetMonth}
                  onChange={(e) => setDates((d) => ({ ...d, [c.id]: e.target.value }))}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs text-ink"
                />
                <Button size="sm" variant="secondary" onClick={() => promote(c.id)} loading={pending}>
                  ใส่ปฏิทิน
                </Button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`ลบ ${c.name}`}
                  data-touch
                  className="grid h-9 w-9 place-items-center rounded-full text-chili hover:bg-chili/10"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
