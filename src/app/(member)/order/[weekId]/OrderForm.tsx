"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import {
  AmountSummary,
  Button,
  DayCard,
  type EggValue,
} from "@/components/ui";
import type { EggStyle, EggDoneness } from "@/lib/db/types";
import { saveOrder, type SaveOrderInput } from "./actions";

export interface DayModel {
  date: string; // YYYY-MM-DD
  weekday: number; // 1..5
  weekdayLabel: string;
  dateLabel: string;
  menuName: string;
  proposer?: string;
  holiday: boolean;
  eating: boolean;
  egg: EggStyle;
  doneness?: EggDoneness;
  note: string;
}

interface OrderFormProps {
  weekId: string;
  pricePerDay: number;
  editable: boolean;
  days: DayModel[];
  hasOrder: boolean;
}

interface DayState {
  eating: boolean;
  eggValue: EggValue;
  note: string;
}

function toEggValue(day: DayModel): EggValue {
  if (day.egg === "boiled" || day.egg === "fried") {
    return { egg: day.egg, doneness: day.doneness ?? "well" };
  }
  return { egg: day.egg };
}

export function OrderForm({
  weekId,
  pricePerDay,
  editable,
  days,
  hasOrder,
}: OrderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<Record<string, DayState>>(() => {
    const init: Record<string, DayState> = {};
    for (const d of days) {
      init[d.date] = {
        eating: d.eating,
        eggValue: toEggValue(d),
        note: d.note,
      };
    }
    return init;
  });

  const selectableDays = useMemo(
    () => days.filter((d) => !d.holiday),
    [days],
  );

  const orderedCount = selectableDays.filter(
    (d) => state[d.date]?.eating,
  ).length;
  const allSelected =
    selectableDays.length > 0 &&
    selectableDays.every((d) => state[d.date]?.eating);

  function update(date: string, patch: Partial<DayState>) {
    if (!editable) return;
    setState((prev) => ({ ...prev, [date]: { ...prev[date], ...patch } }));
  }

  function selectAll() {
    if (!editable) return;
    setState((prev) => {
      const next = { ...prev };
      for (const d of selectableDays) {
        next[d.date] = { ...next[d.date], eating: true };
      }
      return next;
    });
  }

  function onSave() {
    if (!editable) return;
    setError(null);
    const items: SaveOrderInput["items"] = selectableDays
      .filter((d) => state[d.date]?.eating)
      .map((d) => {
        const s = state[d.date];
        const egg = s.eggValue.egg;
        const supportsDoneness = egg === "boiled" || egg === "fried";
        return {
          weekday: d.weekday,
          menuDate: d.date,
          egg,
          doneness: supportsDoneness ? s.eggValue.doneness ?? null : null,
          note: s.note.trim() ? s.note.trim() : null,
        };
      });

    startTransition(async () => {
      const res = await saveOrder({ weekId, items });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex-1 space-y-3 px-4 py-4">
        {editable && (
          <Button
            variant="secondary"
            size="sm"
            onClick={selectAll}
            disabled={allSelected}
            leadingIcon={<CheckCheck className="size-4" aria-hidden />}
            className="w-full"
          >
            เลือกครบ 5 วัน
          </Button>
        )}

        <fieldset
          disabled={!editable}
          className="space-y-3 disabled:opacity-95"
        >
          {days.map((d) => {
            const s = state[d.date];
            return (
              <div key={d.date} className="space-y-2">
                <DayCard
                  weekdayLabel={d.weekdayLabel}
                  dateLabel={d.dateLabel}
                  menuName={d.menuName}
                  proposer={d.proposer}
                  holiday={d.holiday}
                  eating={s.eating}
                  onEatingChange={(eating) => update(d.date, { eating })}
                  eggValue={s.eggValue}
                  onEggChange={(eggValue) => update(d.date, { eggValue })}
                />
                {!d.holiday && s.eating && (
                  <label className="block px-1">
                    <span className="sr-only">หมายเหตุ {d.dateLabel}</span>
                    <input
                      type="text"
                      value={s.note}
                      maxLength={120}
                      disabled={!editable}
                      onChange={(e) =>
                        update(d.date, { note: e.target.value })
                      }
                      placeholder="หมายเหตุ (เช่น ไม่ใส่ผัก)"
                      className="min-h-[44px] w-full rounded-lg border border-border bg-card px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ink"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </fieldset>

        {error && (
          <p className="rounded-lg bg-chili/10 px-3 py-2 text-sm text-chili">
            {error}
          </p>
        )}
      </div>

      <AmountSummary
        days={orderedCount}
        pricePerDay={pricePerDay}
        action={
          editable ? (
            <Button onClick={onSave} loading={pending} disabled={pending}>
              {hasOrder ? "บันทึกการแก้ไข" : "บันทึกออเดอร์"}
            </Button>
          ) : (
            <span className="text-sm font-medium text-muted">แก้ไขไม่ได้</span>
          )
        }
      />
    </>
  );
}
