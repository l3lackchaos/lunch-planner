import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AppBar, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import {
  fromDateStr,
  thaiDayMonth,
  thaiWeekdayShort,
  weekDates,
  weekdayOf,
} from "@/lib/date";
import type {
  MenuRow,
  OrderItemRow,
  OrderRow,
  PaymentRow,
  WeekPlanRow,
} from "@/lib/db/types";
import { OrderForm, type DayModel } from "./OrderForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ weekId: string }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { weekId } = await params;
  const user = await requireUser();
  const sb = await createServerClient();

  const { data: weekPlan } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", weekId)
    .maybeSingle<WeekPlanRow>();

  if (!weekPlan) notFound();

  const dates = weekDates(weekPlan.week_start);
  const weekStart = fromDateStr(weekPlan.week_start);
  const weekEnd = fromDateStr(dates[4]);
  const rangeLabel = `${thaiDayMonth(weekStart)} – ${thaiDayMonth(weekEnd)}`;

  const { data: menusRaw } = await sb
    .from("menus")
    .select("*")
    .in("menu_date", dates);
  const menuByDate = new Map(
    ((menusRaw ?? []) as MenuRow[]).map((m) => [m.menu_date, m]),
  );

  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("week_plan_id", weekPlan.id)
    .eq("user_id", user.id)
    .maybeSingle<OrderRow>();

  let items: OrderItemRow[] = [];
  let latestPayment: PaymentRow | null = null;
  if (order) {
    const [{ data: itemsRaw }, { data: paymentsRaw }] = await Promise.all([
      sb.from("order_items").select("*").eq("order_id", order.id),
      sb
        .from("payments")
        .select("*")
        .eq("order_id", order.id)
        .order("submitted_at", { ascending: false })
        .limit(1),
    ]);
    items = (itemsRaw ?? []) as OrderItemRow[];
    latestPayment = ((paymentsRaw ?? [])[0] as PaymentRow) ?? null;
  }
  const itemByDate = new Map(items.map((it) => [it.menu_date, it]));

  // Editable only while open AND latest payment ≠ confirmed (ADR-0010).
  const isOpen = weekPlan.status === "open";
  const isConfirmed = latestPayment?.status === "confirmed";
  const editable = isOpen && !isConfirmed;

  const days: DayModel[] = dates.map((date) => {
    const menu = menuByDate.get(date);
    const item = itemByDate.get(date);
    return {
      date,
      weekday: weekdayOf(fromDateStr(date)),
      weekdayLabel: thaiWeekdayShort(weekdayOf(fromDateStr(date))),
      dateLabel: thaiDayMonth(date),
      menuName: menu?.name ?? "ยังไม่กำหนดเมนู",
      proposer: menu?.proposed_by_name ?? undefined,
      holiday: menu?.is_holiday ?? false,
      eating: Boolean(item),
      egg: item?.egg ?? "boiled",
      doneness: item?.doneness ?? undefined,
      note: item?.note ?? "",
    };
  });

  const lockReason = !isOpen
    ? "สัปดาห์นี้ปิดรับออเดอร์แล้ว"
    : isConfirmed
      ? "ยืนยันการชำระเงินแล้ว — แก้ออเดอร์ไม่ได้ (ติดต่อแอดมินเพื่อเปิดแก้)"
      : null;

  return (
    <main className="flex min-h-dvh flex-col bg-paper">
      <AppBar title="สั่งอาหาร" subtitle={rangeLabel} backHref="/" />

      {lockReason && (
        <div className="flex items-start gap-2 border-b border-border bg-yolk/10 px-4 py-2.5 text-sm text-ink">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{lockReason}</span>
        </div>
      )}

      {days.every((d) => d.holiday) ? (
        <EmptyState
          title="สัปดาห์นี้เป็นวันหยุดทั้งหมด"
          description="ไม่มีวันให้สั่งอาหาร"
          action={
            <Link href="/" className="text-sm font-semibold text-ink underline">
              กลับหน้าแรก
            </Link>
          }
        />
      ) : (
        <OrderForm
          weekId={weekPlan.id}
          pricePerDay={weekPlan.price_per_day}
          editable={editable}
          days={days}
          hasOrder={Boolean(order)}
        />
      )}
    </main>
  );
}
