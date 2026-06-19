import { notFound } from "next/navigation";
import { requireCookOrAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { AppBar } from "@/components/ui";
import type { OrderCell } from "@/components/ui";
import { thaiDayMonth, weekDates, weekdayOf, fromDateStr } from "@/lib/date";
import type {
  WeekPlanRow,
  MenuRow,
  WeeklyOrderGridRow,
  DailyEggSummaryRow,
  DailyNotOrderedRow,
  OrderItemRow,
  OrderRow,
  UserRow,
} from "@/lib/db/types";
import {
  SummaryClient,
  type GridRow,
  type DayMeta,
  type CookDay,
  type EggCount,
} from "./SummaryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ weekId: string }>;
}

/** Map a weekly_order_grid `cell` string → an OrderGridCell descriptor. */
function cellFromLabel(label: string): OrderCell {
  switch (label) {
    case "ไม่กิน":
      return { kind: "not-eating" };
    case "ไม่ทานไข่":
      return { kind: "no-egg" };
    case "ต้ม":
      return { kind: "egg", egg: "boiled" };
    case "ไข่ดาวสุก":
      return { kind: "egg", egg: "fried", doneness: "well" };
    case "ดาวไม่สุก":
      return { kind: "egg", egg: "fried", doneness: "soft" };
    case "ไข่เจียว":
      return { kind: "egg", egg: "omelette" };
    default:
      // Unknown / null cell → treat as not eating.
      return { kind: "not-eating" };
  }
}

export default async function SummaryPage({ params }: PageProps) {
  const { weekId } = await params;
  // Cook-readable summary (read-only): cooks or admins (RLS lets them read across members).
  await requireCookOrAdmin();
  const sb = await createServerClient();

  const { data: week } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", weekId)
    .maybeSingle<WeekPlanRow>();
  if (!week) notFound();

  const dates = weekDates(week.week_start); // 5 strings, Mon..Fri
  const firstDate = dates[0];
  const lastDate = dates[4];

  // Menus for the week (to know holidays + weekday labels).
  const { data: menuRows } = await sb
    .from("menus")
    .select("menu_date, is_holiday")
    .gte("menu_date", firstDate)
    .lte("menu_date", lastDate)
    .returns<Pick<MenuRow, "menu_date" | "is_holiday">[]>();
  const holidayByDate = new Map(
    (menuRows ?? []).map((m) => [m.menu_date, m.is_holiday]),
  );

  const days: DayMeta[] = dates.map((date) => ({
    date,
    weekday: weekdayOf(fromDateStr(date)),
    isHoliday: holidayByDate.get(date) ?? false,
  }));

  // ── Order Grid (all members × Mon–Fri) ─────────────────────────────────────
  const { data: gridRowsRaw } = await sb
    .from("weekly_order_grid")
    .select("user_id, display_name, menu_date, cell, is_eating")
    .gte("menu_date", firstDate)
    .lte("menu_date", lastDate)
    .returns<WeeklyOrderGridRow[]>();

  // Group by member, slot cells by date.
  const byUser = new Map<
    string,
    { displayName: string; cellByDate: Map<string, OrderCell> }
  >();
  for (const g of gridRowsRaw ?? []) {
    let entry = byUser.get(g.user_id);
    if (!entry) {
      entry = { displayName: g.display_name, cellByDate: new Map() };
      byUser.set(g.user_id, entry);
    }
    entry.cellByDate.set(g.menu_date, cellFromLabel(g.cell));
  }

  const rows: GridRow[] = [...byUser.entries()]
    .map(([userId, entry]) => {
      const cells: OrderCell[] = days.map((d) => {
        if (d.isHoliday) return { kind: "holiday" };
        return entry.cellByDate.get(d.date) ?? { kind: "not-eating" };
      });
      const workingCells = cells.filter((_, i) => !days[i].isHoliday);
      const notEatingAllWeek =
        workingCells.length > 0 &&
        workingCells.every((c) => c.kind === "not-eating");
      return { userId, displayName: entry.displayName, cells, notEatingAllWeek };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "th"));

  // ── Cook count per day ─────────────────────────────────────────────────────
  const { data: eggSummary } = await sb
    .from("daily_egg_summary")
    .select("menu_date, egg, doneness, qty")
    .gte("menu_date", firstDate)
    .lte("menu_date", lastDate)
    .returns<DailyEggSummaryRow[]>();

  const { data: notOrderedRows } = await sb
    .from("daily_not_ordered")
    .select("menu_date, user_id, display_name")
    .gte("menu_date", firstDate)
    .lte("menu_date", lastDate)
    .returns<DailyNotOrderedRow[]>();

  // Special notes: order_items with a note, joined to the member display_name.
  const { data: orderRows } = await sb
    .from("orders")
    .select("id, user_id")
    .eq("week_plan_id", weekId)
    .returns<Pick<OrderRow, "id" | "user_id">[]>();
  const orderIds = (orderRows ?? []).map((o) => o.id);
  const userByOrder = new Map((orderRows ?? []).map((o) => [o.id, o.user_id]));

  const noteItems: Pick<OrderItemRow, "order_id" | "menu_date" | "note">[] = [];
  if (orderIds.length > 0) {
    const { data } = await sb
      .from("order_items")
      .select("order_id, menu_date, note")
      .in("order_id", orderIds)
      .not("note", "is", null)
      .returns<Pick<OrderItemRow, "order_id" | "menu_date" | "note">[]>();
    if (data) noteItems.push(...data);
  }

  // Resolve member names for notes.
  const noteUserIds = [
    ...new Set(noteItems.map((n) => userByOrder.get(n.order_id)).filter(Boolean)),
  ] as string[];
  const nameById = new Map<string, string>();
  if (noteUserIds.length > 0) {
    const { data: users } = await sb
      .from("users")
      .select("id, display_name")
      .in("id", noteUserIds)
      .returns<Pick<UserRow, "id" | "display_name">[]>();
    for (const u of users ?? []) nameById.set(u.id, u.display_name);
  }

  // Label per egg+doneness for the count list (fixed order).
  const eggOrder: { key: string; label: string }[] = [
    { key: "boiled|null", label: "ต้ม" },
    { key: "fried|well", label: "ดาวสุก" },
    { key: "fried|soft", label: "ดาวไม่สุก" },
    { key: "omelette|null", label: "เจียว" },
    { key: "none|null", label: "ไม่ทานไข่" },
  ];

  const cookDays: CookDay[] = days.map((d) => {
    const dayEgg = (eggSummary ?? []).filter((e) => e.menu_date === d.date);
    const qtyByKey = new Map<string, number>();
    for (const e of dayEgg) {
      // boiled/omelette/none ignore doneness; fried may carry well/soft.
      let key: string;
      if (e.egg === "fried") {
        key = `fried|${e.doneness === "soft" ? "soft" : "well"}`;
      } else {
        key = `${e.egg}|null`;
      }
      qtyByKey.set(key, (qtyByKey.get(key) ?? 0) + e.qty);
    }
    const counts: EggCount[] = eggOrder.map((o) => ({
      label: o.label,
      qty: qtyByKey.get(o.key) ?? 0,
    }));
    const totalHeads = counts.reduce((s, c) => s + c.qty, 0);

    const notes = noteItems
      .filter((n) => n.menu_date === d.date && n.note)
      .map((n) => ({
        displayName: nameById.get(userByOrder.get(n.order_id) ?? "") ?? "—",
        note: n.note as string,
      }));

    const notOrdered = (notOrderedRows ?? [])
      .filter((m) => m.menu_date === d.date)
      .map((m) => ({ userId: m.user_id, displayName: m.display_name }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "th"));

    return {
      date: d.date,
      weekday: d.weekday,
      isHoliday: d.isHoliday,
      counts,
      totalHeads,
      notes,
      notOrdered,
    };
  });

  const weekLabel = `${thaiDayMonth(firstDate)} – ${thaiDayMonth(lastDate)}`;

  return (
    <div className="-mx-3 -my-4">
      <AppBar title="สรุปแม่ครัว" subtitle={weekLabel} backHref="/admin" />
      <SummaryClient
        weekLabel={weekLabel}
        days={days}
        rows={rows}
        cookDays={cookDays}
      />
    </div>
  );
}
