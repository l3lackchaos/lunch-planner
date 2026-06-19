import Link from "next/link";
import { notFound } from "next/navigation";
import { AppBar, Card, StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { fromDateStr, thaiDayMonth, weekDates } from "@/lib/date";
import { calcAmount, formatTHB } from "@/lib/money";
import type {
  OrderRow,
  PaymentRow,
  WeekPlanRow,
} from "@/lib/db/types";
import { PaymentForm } from "./PaymentForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const METHOD_LABEL: Record<string, string> = {
  slip: "โอน/สลิป",
  cash: "เงินสด",
};

export default async function PaymentPage({ params }: PageProps) {
  const { orderId } = await params;
  const user = await requireUser();
  const sb = await createServerClient();

  // RLS scopes orders to the owner; a non-owner gets null → notFound.
  const { data: order } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (!order || order.user_id !== user.id) notFound();

  const { data: weekPlan } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", order.week_plan_id)
    .maybeSingle<WeekPlanRow>();
  if (!weekPlan) notFound();

  const { count: daysCount } = await sb
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const orderedDays = daysCount ?? 0;
  const amount = calcAmount(orderedDays, weekPlan.price_per_day);

  // Append-only payments (ADR-0009): full history, latest first.
  const { data: paymentsRaw } = await sb
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .order("submitted_at", { ascending: false });
  const payments = (paymentsRaw ?? []) as PaymentRow[];
  const latest = payments[0] ?? null;

  const dates = weekDates(weekPlan.week_start);
  const rangeLabel = `${thaiDayMonth(fromDateStr(weekPlan.week_start))} – ${thaiDayMonth(fromDateStr(dates[4]))}`;

  // Can submit a (new) payment unless the latest is already pending/confirmed.
  // rejected → allow re-submit (inserts a NEW row, ADR-0009).
  const canSubmit =
    orderedDays > 0 &&
    (latest === null || latest.status === "rejected");

  return (
    <main className="min-h-dvh bg-paper pb-8">
      <AppBar
        title="แจ้งชำระเงิน"
        subtitle={rangeLabel}
        backHref="/"
      />

      <div className="space-y-4 px-4 py-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">ยอดที่ต้องชำระ</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink tabular-nums">
                {formatTHB(amount)}
              </p>
              <p className="mt-0.5 text-sm text-muted tabular-nums">
                {orderedDays} วัน × {formatTHB(weekPlan.price_per_day)}
              </p>
            </div>
            <StatusChip status={latest ? latest.status : "unpaid"} />
          </div>

          {latest?.status === "rejected" && latest.reject_reason && (
            <p className="mt-3 rounded-lg bg-chili/10 px-3 py-2 text-sm text-chili">
              เหตุผลที่ปฏิเสธ: {latest.reject_reason}
            </p>
          )}
          {latest?.status === "pending" && (
            <p className="mt-3 rounded-lg bg-yolk/10 px-3 py-2 text-sm text-ink">
              ส่งแล้ว — รอแอดมินยืนยัน
            </p>
          )}
          {latest?.status === "confirmed" && (
            <p className="mt-3 rounded-lg bg-leaf/10 px-3 py-2 text-sm text-leaf">
              ยืนยันการชำระเงินแล้ว ขอบคุณค่ะ
            </p>
          )}
        </Card>

        {orderedDays === 0 ? (
          <Card className="p-4 text-sm text-muted">
            ยังไม่มีออเดอร์สำหรับสัปดาห์นี้ —{" "}
            <Link
              href={`/order/${weekPlan.id}`}
              className="font-semibold text-ink underline"
            >
              สั่งอาหารก่อน
            </Link>
          </Card>
        ) : (
          <PaymentForm
            orderId={order.id}
            amount={amount}
            canSubmit={canSubmit}
            isResubmit={latest?.status === "rejected"}
          />
        )}

        {/* Payment history (append-only) */}
        {payments.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-muted">
              ประวัติการแจ้งชำระ
            </h2>
            {payments.map((p) => (
              <Card key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {METHOD_LABEL[p.method] ?? p.method} ·{" "}
                    {formatTHB(p.amount)}
                  </p>
                  <p className="text-xs text-muted">
                    {thaiDayMonth(p.submitted_at.slice(0, 10))}
                    {p.reject_reason ? ` · ${p.reject_reason}` : ""}
                  </p>
                </div>
                <StatusChip status={p.status} size="sm" />
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
