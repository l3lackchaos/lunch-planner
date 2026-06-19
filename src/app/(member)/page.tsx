import Link from "next/link";
import { CalendarRange, UtensilsCrossed, Wallet } from "lucide-react";
import {
  AppBar,
  Card,
  DayCardSkeleton,
  EmptyState,
  StatusChip,
  type PaymentStatus,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { eggCellLabel } from "@/lib/egg";
import {
  fromDateStr,
  thaiDayMonth,
  thaiWeekdayShort,
  weekDates,
  weekdayOf,
} from "@/lib/date";
import { calcAmount, formatTHB } from "@/lib/money";
import type {
  MenuRow,
  OrderItemRow,
  OrderRow,
  PaymentRow,
  WeekPlanRow,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** Map the latest payment row (or null) to the StatusChip state. */
function paymentStatusChip(payment: PaymentRow | null): PaymentStatus {
  if (!payment) return "unpaid";
  return payment.status;
}

export default async function MemberHomePage() {
  // Home must tolerate a null session — render a skeleton, never redirect (avoids LIFF loop).
  const user = await getCurrentUser();
  if (!user) {
    return <HomeSkeleton />;
  }

  const sb = await createServerClient();

  // The current open Week Plan (members only ever have 0–1 open week).
  const { data: weekPlan } = await sb
    .from("week_plans")
    .select("*")
    .eq("status", "open")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle<WeekPlanRow>();

  if (!weekPlan) {
    return (
      <main className="min-h-dvh bg-paper">
        <AppBar title="สัปดาห์นี้" trailing={<MeLink />} />
        <EmptyState
          icon={<CalendarRange className="size-7" aria-hidden />}
          title="ยังไม่มีแพลนสัปดาห์นี้"
          description="รอแอดมินเปิดรับ แล้วกลับมาสั่งอาหารได้เลย"
        />
      </main>
    );
  }

  const dates = weekDates(weekPlan.week_start);

  // Menus for Mon–Fri of this week (holidays included so we can skip them in the UI).
  const { data: menusRaw } = await sb
    .from("menus")
    .select("*")
    .in("menu_date", dates);
  const menus = (menusRaw ?? []) as MenuRow[];
  const menuByDate = new Map(menus.map((m) => [m.menu_date, m]));

  // My order for this week (RLS scopes to me).
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
  const orderedDays = items.length;
  const amount = calcAmount(orderedDays, weekPlan.price_per_day);
  const status = paymentStatusChip(latestPayment);
  const locked = latestPayment?.status === "confirmed";

  const weekStart = fromDateStr(weekPlan.week_start);
  const weekEnd = fromDateStr(dates[4]);
  const rangeLabel = `${thaiDayMonth(weekStart)} – ${thaiDayMonth(weekEnd)}`;

  return (
    <main className="min-h-dvh bg-paper pb-8">
      <AppBar title="สัปดาห์นี้" subtitle={rangeLabel} trailing={<MeLink />} />

      <div className="space-y-4 px-4 py-4">
        {/* My order + payment status card */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">ออเดอร์ของฉัน</p>
              <p className="mt-0.5 text-lg font-bold text-ink">
                {orderedDays > 0
                  ? `สั่งแล้ว ${orderedDays} วัน`
                  : "ยังไม่ได้สั่ง"}
              </p>
              <p className="mt-0.5 text-sm text-muted tabular-nums">
                ราคา {formatTHB(weekPlan.price_per_day)}/วัน · รวม{" "}
                {formatTHB(amount)}
              </p>
            </div>
            <StatusChip status={status} />
          </div>

          {latestPayment?.status === "rejected" &&
            latestPayment.reject_reason && (
              <p className="mt-2 rounded-lg bg-chili/10 px-3 py-2 text-sm text-chili">
                เหตุผลที่ปฏิเสธ: {latestPayment.reject_reason}
              </p>
            )}

          <div className="mt-4 flex gap-2">
            <Link
              href={`/order/${weekPlan.id}`}
              data-touch
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-yolk px-4 text-[15px] font-semibold text-yolk-ink shadow-sm outline-none hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <UtensilsCrossed className="size-4" aria-hidden />
              {orderedDays > 0
                ? locked
                  ? "ดูออเดอร์"
                  : "แก้ออเดอร์"
                : "สั่งอาหาร"}
            </Link>
            {order && orderedDays > 0 && (
              <Link
                href={`/payment/${order.id}`}
                data-touch
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-[15px] font-semibold text-ink outline-none hover:bg-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <Wallet className="size-4" aria-hidden />
                แจ้งชำระ
              </Link>
            )}
          </div>
        </Card>

        {/* Mon–Fri menus (skip holidays) */}
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">
            เมนูสัปดาห์นี้
          </h2>
          {dates.map((date) => {
            const menu = menuByDate.get(date);
            if (menu?.is_holiday) return null;
            const weekday = weekdayOf(fromDateStr(date));
            const item = itemByDate.get(date);
            return (
              <Card key={date} className="flex items-center gap-3 p-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-paper text-center leading-none">
                  <span className="text-sm font-bold text-ink">
                    {thaiWeekdayShort(weekday)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{thaiDayMonth(date)}</p>
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {menu?.name ?? "ยังไม่กำหนดเมนู"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted">
                  {item ? eggCellLabel(item.egg, item.doneness) : "ไม่กิน"}
                </span>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function MeLink() {
  return (
    <Link
      href="/me"
      className="grid size-11 place-items-center rounded-full text-ink outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-ink"
      aria-label="ของฉัน"
    >
      <Wallet className="size-5" aria-hidden />
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <main className="min-h-dvh bg-paper">
      <AppBar title="สัปดาห์นี้" />
      <div className="space-y-3 px-4 py-4" aria-busy role="status">
        <span className="sr-only">กำลังโหลด</span>
        <DayCardSkeleton />
        <DayCardSkeleton />
        <DayCardSkeleton />
      </div>
    </main>
  );
}
