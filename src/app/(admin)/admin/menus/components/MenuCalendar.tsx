"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MenuRow, UserRow } from "@/lib/db/types";
import { DayEditor } from "./DayEditor";

const WEEKDAY_HEAD = ["จ", "อ", "พ", "พฤ", "ศ"]; // Mon–Fri only

export interface MenuCalendarProps {
  /** First day of the displayed month, YYYY-MM-DD. */
  monthStart: string;
  /** Working dates (Mon–Fri) of the month, YYYY-MM-DD, in order. */
  workingDates: string[];
  /** Leading blank cells so the first working day lands under its weekday column. */
  leadingBlanks: number;
  /** Menus for this month keyed by menu_date. */
  menusByDate: Record<string, MenuRow>;
  /** Active members for the proposer picker. */
  members: Pick<UserRow, "id" | "display_name">[];
}

/** Proposer display = linked member's name, else free-text name. */
function proposerLabel(
  menu: MenuRow | undefined,
  members: Pick<UserRow, "id" | "display_name">[],
): string | null {
  if (!menu) return null;
  if (menu.proposed_by_user_id) {
    return members.find((m) => m.id === menu.proposed_by_user_id)?.display_name ?? "สมาชิก";
  }
  return menu.proposed_by_name ?? null;
}

function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

export function MenuCalendar({
  workingDates,
  leadingBlanks,
  menusByDate,
  members,
}: MenuCalendarProps) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        {/* หัวคอลัมน์ จ–ศ */}
        <div className="grid grid-cols-5 border-b border-border bg-paper text-center text-xs font-bold text-muted">
          {WEEKDAY_HEAD.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[88px] border-b border-r border-border bg-paper/40" />
          ))}

          {workingDates.map((date, idx) => {
            const menu = menusByDate[date];
            const isHoliday = menu?.is_holiday ?? false;
            const proposer = proposerLabel(menu, members);
            // ปิดท้ายแถวด้วยขอบขวา; คอลัมน์สุดท้ายของ จ–ศ คือ index%5===4
            const col = (leadingBlanks + idx) % 5;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setOpenDate(date)}
                className={cn(
                  "min-h-[88px] border-b border-border p-1.5 text-left align-top outline-none",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink",
                  col !== 4 && "border-r",
                  isHoliday
                    ? "bg-[repeating-linear-gradient(45deg,var(--color-border),var(--color-border)_5px,transparent_5px,transparent_10px)]"
                    : "hover:bg-paper",
                )}
                aria-label={`วันที่ ${dayOfMonth(date)}${menu?.name ? ` — ${menu.name}` : ""}`}
              >
                <span className="block text-xs font-bold text-ink">{dayOfMonth(date)}</span>
                {isHoliday ? (
                  <span className="mt-1 block text-[11px] font-medium text-muted">วันหยุด</span>
                ) : menu ? (
                  <span className="mt-1 block space-y-0.5">
                    <span className="block truncate text-[12px] font-medium leading-tight text-ink">
                      {menu.name || "—"}
                    </span>
                    {proposer && (
                      <span className="block truncate text-[10px] text-muted">{proposer}</span>
                    )}
                  </span>
                ) : (
                  <span className="mt-1 flex items-center gap-0.5 text-[11px] text-muted">
                    <Plus className="size-3" aria-hidden /> เพิ่ม
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {openDate && (
        <DayEditor
          date={openDate}
          menu={menusByDate[openDate]}
          members={members}
          onClose={() => setOpenDate(null)}
        />
      )}
    </>
  );
}
