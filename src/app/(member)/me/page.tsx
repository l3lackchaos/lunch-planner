import Link from "next/link";
import { Receipt } from "lucide-react";
import { AppBar, Card, EmptyState, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { fromDateStr, thaiDayMonth, weekDates } from "@/lib/date";
import { calcAmount, formatTHB } from "@/lib/money";
import type {
  OrderItemRow,
  OrderRow,
  PaymentRow,
  WeekPlanRow,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  slip: "โอน/สลิป",
  cash: "เงินสด",
};

export default async function MePage() {
  const user = await requireUser();
  const sb = await createServerClient();

  // My recent orders (latest week first). RLS scopes to me.
  const { data: ordersRaw } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const orders = (ordersRaw ?? []) as OrderRow[];

  if (orders.length === 0) {
    return (
      <main className="min-h-dvh bg-paper">
        <AppBar title="ของฉัน" backHref="/" />
        <EmptyState
          icon={<Receipt className="size-7" aria-hidden />}
          title="ยังไม่มีออเดอร์"
          description="เริ่มสั่งอาหารสัปดาห์นี้ได้จากหน้าแรก"
          action={
            <Link href="/" className="text-sm font-semibold text-ink underline">
              กลับหน้าแรก
            </Link>
          }
        />
      </main>
    );
  }

  const orderIds = orders.map((o) => o.id);
  const weekIds = Array.from(new Set(orders.map((o) => o.week_plan_id)));

  const [{ data: weeksRaw }, { data: itemsRaw }, { data: paymentsRaw }] =
    await Promise.all([
      sb.from("week_plans").select("*").in("id", weekIds),
      sb.from("order_items").select("order_id").in("order_id", orderIds),
      sb
        .from("payments")
        .select("*")
        .in("order_id", orderIds)
        .order("submitted_at", { ascending: false }),
    ]);

  const weekById = new Map(
    ((weeksRaw ?? []) as WeekPlanRow[]).map((w) => [w.id, w]),
  );

  const dayCountByOrder = new Map<string, number>();
  for (const it of (itemsRaw ?? []) as Pick<OrderItemRow, "order_id">[]) {
    dayCountByOrder.set(it.order_id, (dayCountByOrder.get(it.order_id) ?? 0) + 1);
  }

  // Group payments by order, already sorted latest-first.
  const paymentsByOrder = new Map<string, PaymentRow[]>();
  for (const p of (paymentsRaw ?? []) as PaymentRow[]) {
    const arr = paymentsByOrder.get(p.order_id) ?? [];
    arr.push(p);
    paymentsByOrder.set(p.order_id, arr);
  }

  return (
    <main className="min-h-dvh bg-paper pb-8">
      <AppBar title="ของฉัน" backHref="/" />

      <div className="space-y-4 px-4 py-4">
        {orders.map((order) => {
          const week = weekById.get(order.week_plan_id);
          const days = dayCountByOrder.get(order.id) ?? 0;
          const pricePerDay = week?.price_per_day ?? 0;
          const amount = calcAmount(days, pricePerDay);
          const payments = paymentsByOrder.get(order.id) ?? [];
          const latest = payments[0] ?? null;

          const rangeLabel = week
            ? `${thaiDayMonth(fromDateStr(week.week_start))} – ${thaiDayMonth(
                fromDateStr(weekDates(week.week_start)[4]),
              )}`
            : "—";

          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">สัปดาห์</p>
                  <p className="text-base font-bold text-ink">{rangeLabel}</p>
                  <p className="mt-0.5 text-sm text-muted tabular-nums">
                    {days} วัน · {formatTHB(amount)}
                  </p>
                </div>
                <StatusChip status={latest ? latest.status : "unpaid"} />
              </div>

              <div className="mt-3 flex gap-3 text-sm">
                <Link
                  href={`/order/${order.week_plan_id}`}
                  className="font-semibold text-ink underline"
                >
                  ดูออเดอร์
                </Link>
                <Link
                  href={`/payment/${order.id}`}
                  className="font-semibold text-ink underline"
                >
                  การชำระเงิน
                </Link>
              </div>

              {payments.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-muted">
                        {thaiDayMonth(p.submitted_at.slice(0, 10))} ·{" "}
                        {METHOD_LABEL[p.method] ?? p.method} ·{" "}
                        {formatTHB(p.amount)}
                      </span>
                      <StatusChip status={p.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
