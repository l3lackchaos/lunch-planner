"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toggleVote } from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  votes: number;
  voted: boolean;
};

export default function VoteList({
  roundId,
  items,
  canVote,
}: {
  roundId: string;
  items: Item[];
  canVote: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [, startTransition] = useTransition();

  function onToggle(item: Item) {
    if (!canVote) return;
    const next = !item.voted;
    startTransition(async () => {
      setOptimistic((cur) =>
        cur.map((i) =>
          i.id === item.id ? { ...i, voted: next, votes: i.votes + (next ? 1 : -1) } : i,
        ),
      );
      await toggleVote({ roundId, candidateId: item.id, voted: next });
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {optimistic.map((item) => (
        <li key={item.id}>
          <Card className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{item.name}</p>
              {item.description && (
                <p className="truncate text-xs text-muted">{item.description}</p>
              )}
              <p className="mt-0.5 text-xs text-muted">{item.votes} โหวต</p>
            </div>
            <button
              type="button"
              onClick={() => onToggle(item)}
              disabled={!canVote}
              aria-pressed={item.voted}
              aria-label={item.voted ? `ยกเลิกโหวต ${item.name}` : `โหวต ${item.name}`}
              data-touch
              className={cn(
                "flex h-11 min-w-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                item.voted
                  ? "bg-yolk text-yolk-ink"
                  : "border border-border bg-card text-ink hover:bg-paper",
                !canVote && "opacity-50",
              )}
            >
              {item.voted ? <Check size={16} /> : <Plus size={16} />}
              {item.voted ? "โหวตแล้ว" : "โหวต"}
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
