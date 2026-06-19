"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Printer, Users, UtensilsCrossed } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  OrderGridCell,
  SearchInput,
  SegmentedControl,
  normalizeQuery,
  type OrderCell,
} from "@/components/ui";
import { thaiDayMonth, thaiWeekdayShort } from "@/lib/date";

/** One row of the grid: a member + their cell per weekday (1..5). */
export interface GridRow {
  userId: string;
  displayName: string;
  /** cell label per day index 0..4 (Mon..Fri), already mapped from the view */
  cells: OrderCell[];
  /** true when the member is "ไม่กิน" every working day (highlight). */
  notEatingAllWeek: boolean;
}

export interface DayMeta {
  /** weekday 1..5 */
  weekday: number;
  /** YYYY-MM-DD */
  date: string;
  isHoliday: boolean;
}

export interface EggCount {
  label: string;
  qty: number;
}

/** Per-day cook count payload, keyed by date. */
export interface CookDay {
  date: string;
  weekday: number;
  isHoliday: boolean;
  counts: EggCount[];
  totalHeads: number;
  /** special notes: member name + note text */
  notes: { displayName: string; note: string }[];
  /** members who have not ordered that day */
  notOrdered: { userId: string; displayName: string }[];
}

type Tab = "grid" | "cook";

export function SummaryClient({
  weekLabel,
  days,
  rows,
  cookDays,
}: {
  weekLabel: string;
  days: DayMeta[];
  rows: GridRow[];
  cookDays: CookDay[];
}) {
  const [tab, setTab] = useState<Tab>("grid");

  return (
    <div className="space-y-4 px-3 py-4 print:px-0">
      <div className="print:hidden">
        <SegmentedControl<Tab>
          aria-label="เลือกมุมมองสรุป"
          options={[
            { value: "grid", label: "ตารางสัปดาห์" },
            { value: "cook", label: "ยอดนับรายวัน" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "grid" ? (
        <OrderGridSection weekLabel={weekLabel} days={days} rows={rows} />
      ) : (
        <CookCountSection cookDays={cookDays} />
      )}
    </div>
  );
}

// ── Order Grid ───────────────────────────────────────────────────────────────

function gridText(weekLabel: string, days: DayMeta[], rows: GridRow[]): string {
  const header = ["ชื่อ", ...days.map((d) => thaiWeekdayShort(d.weekday))].join("\t");
  const body = rows
    .map((r) => [r.displayName, ...r.cells.map(cellText)].join("\t"))
    .join("\n");
  return `สรุปออเดอร์ ${weekLabel}\n${header}\n${body}`;
}

function cellText(cell: OrderCell): string {
  switch (cell.kind) {
    case "egg":
      if (cell.egg === "fried")
        return `ดาว${cell.doneness === "soft" ? "ไม่สุก" : "สุก"}`;
      if (cell.egg === "boiled") return "ต้ม";
      return "เจียว";
    case "no-egg":
      return "ไม่ทานไข่";
    case "not-eating":
      return "ไม่กิน";
    case "holiday":
      return "หยุด";
  }
}

function OrderGridSection({
  weekLabel,
  days,
  rows,
}: {
  weekLabel: string;
  days: DayMeta[];
  rows: GridRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-6" aria-hidden />}
        title="ยังไม่มีสมาชิกในรายชื่อ"
        description="เพิ่มสมาชิกในหน้ารายชื่อก่อน แล้วตารางจะแสดงครบทุกคน"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <h2 className="text-sm font-bold text-ink">ตารางสรุปสัปดาห์</h2>
        <div className="flex gap-2">
          <CopyButton getText={() => gridText(weekLabel, days, rows)} />
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Printer className="size-4" aria-hidden />}
            onClick={() => window.print()}
          >
            พิมพ์
          </Button>
        </div>
      </div>

      <h2 className="hidden text-base font-bold text-ink print:block">
        สรุปออเดอร์ {weekLabel}
      </h2>

      {/* horizontally scrollable on phones; sticky header + first column */}
      <div className="overflow-x-auto rounded-card border border-border print:overflow-visible print:border-0">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[110px] border-b border-r border-border bg-paper px-2 py-2 text-left font-bold text-ink">
                ชื่อ
              </th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className="min-w-[76px] border-b border-border bg-paper px-1 py-2 text-center font-semibold text-ink"
                >
                  <div>{thaiWeekdayShort(d.weekday)}</div>
                  <div className="font-normal text-muted">{thaiDayMonth(d.date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.userId}
                className={r.notEatingAllWeek ? "bg-yolk/[0.06]" : undefined}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 max-w-[140px] truncate border-b border-r border-border px-2 py-1.5 text-left font-medium ${
                    r.notEatingAllWeek ? "bg-yolk/10 text-ink" : "bg-card text-ink"
                  }`}
                >
                  <span className="block truncate">{r.displayName}</span>
                  {r.notEatingAllWeek && (
                    <span className="block text-[10px] font-normal text-muted">
                      ไม่กินทั้งสัปดาห์
                    </span>
                  )}
                </th>
                {r.cells.map((cell, i) => (
                  <td key={days[i].date} className="border-b border-border p-1 align-middle">
                    <OrderGridCell cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted print:hidden">
        เลื่อนตารางแนวนอนเพื่อดูครบทุกวัน · แถวไฮไลต์ = ไม่กินทั้งสัปดาห์
      </p>
    </div>
  );
}

// ── Cook Count ───────────────────────────────────────────────────────────────

function cookText(day: CookDay): string {
  const lines: string[] = [];
  lines.push(`ยอดอาหาร ${thaiWeekdayShort(day.weekday)} ${thaiDayMonth(day.date)}`);
  lines.push(`รวม ${day.totalHeads} หัว`);
  for (const c of day.counts) lines.push(`- ${c.label}: ${c.qty}`);
  if (day.notes.length > 0) {
    lines.push("หมายเหตุ:");
    for (const n of day.notes) lines.push(`- ${n.displayName}: ${n.note}`);
  }
  if (day.notOrdered.length > 0) {
    lines.push(`ยังไม่สั่ง (${day.notOrdered.length}):`);
    lines.push(day.notOrdered.map((m) => m.displayName).join(", "));
  }
  return lines.join("\n");
}

function CookCountSection({ cookDays }: { cookDays: CookDay[] }) {
  const [dateSel, setDateSel] = useState(cookDays[0]?.date ?? "");
  const [query, setQuery] = useState("");

  const day = useMemo(
    () => cookDays.find((d) => d.date === dateSel) ?? cookDays[0],
    [cookDays, dateSel],
  );

  const filteredNotOrdered = useMemo(() => {
    if (!day) return [];
    const q = normalizeQuery(query);
    if (!q) return day.notOrdered;
    return day.notOrdered.filter((m) => normalizeQuery(m.displayName).includes(q));
  }, [day, query]);

  const filteredNotes = useMemo(() => {
    if (!day) return [];
    const q = normalizeQuery(query);
    if (!q) return day.notes;
    return day.notes.filter((n) => normalizeQuery(n.displayName).includes(q));
  }, [day, query]);

  if (cookDays.length === 0 || !day) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="size-6" aria-hidden />}
        title="ยังไม่มีวันทำการ"
        description="ตั้งเมนูรายวันของสัปดาห์นี้ก่อน"
      />
    );
  }

  return (
    <div className="space-y-4">
      <SegmentedControl
        aria-label="เลือกวัน"
        size="sm"
        options={cookDays.map((d) => ({
          value: d.date,
          label: thaiWeekdayShort(d.weekday),
          disabled: d.isHoliday,
        }))}
        value={day.date}
        onChange={setDateSel}
      />

      {day.isHoliday ? (
        <EmptyState title="วันหยุด" description="วันนี้ไม่มีการสั่งอาหาร" />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">
                {thaiWeekdayShort(day.weekday)} {thaiDayMonth(day.date)}
              </p>
              <p className="text-xs text-muted">รวม {day.totalHeads} หัว</p>
            </div>
            <CopyButton getText={() => cookText(day)} />
          </div>

          <Card className="divide-y divide-border">
            {day.counts.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-ink">{c.label}</span>
                <span className="font-bold text-ink">{c.qty}</span>
              </div>
            ))}
          </Card>

          <SearchInput
            aria-label="ค้นหาชื่อในรายการ"
            placeholder="ค้นหาชื่อ…"
            onDebouncedChange={(n) => setQuery(n)}
            onChange={(raw) => raw === "" && setQuery("")}
          />

          {filteredNotes.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink">หมายเหตุพิเศษ</h3>
              <Card className="divide-y divide-border">
                {filteredNotes.map((n, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <span className="font-medium text-ink">{n.displayName}</span>
                    <span className="text-muted"> — {n.note}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-ink">
              ยังไม่สั่ง ({day.notOrdered.length})
            </h3>
            {filteredNotOrdered.length === 0 ? (
              <p className="px-1 text-sm text-muted">
                {query ? "ไม่พบชื่อที่ค้นหา" : "ทุกคนสั่งครบแล้ว"}
              </p>
            ) : (
              <Card className="flex flex-wrap gap-1.5 px-4 py-3">
                {filteredNotOrdered.map((m) => (
                  <span
                    key={m.userId}
                    className="rounded-full border border-border bg-paper px-2.5 py-1 text-xs text-ink"
                  >
                    {m.displayName}
                  </span>
                ))}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Copy-to-clipboard button ─────────────────────────────────────────────────

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      leadingIcon={
        copied ? (
          <Check className="size-4 text-leaf" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )
      }
      onClick={copy}
    >
      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
    </Button>
  );
}
