import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import { AppBar, Card } from "@/components/ui";
import { formatTHB } from "@/lib/money";
import { thaiDayMonth, weekDates } from "@/lib/date";
import type {
  WeekPlanRow,
  WeeklyPaymentStatusRow,
  OrderRow,
  PaymentRow,
} from "@/lib/db/types";
import { PaymentsClient, type PaymentLine } from "./PaymentsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ weekId: string }>;
}

export default async function PaymentsPage({ params }: PageProps) {
  const { weekId } = await params;
  await requireAdmin();
  const sb = await createServerClient();

  // Week plan (for header + week range).
  const { data: week } = await sb
    .from("week_plans")
    .select("*")
    .eq("id", weekId)
    .maybeSingle<WeekPlanRow>();
  if (!week) notFound();

  // Payment status per member (latest payment per order, append-only view).
  const { data: statusRows } = await sb
    .from("weekly_payment_status")
    .select("*")
    .eq("week_plan_id", weekId)
    .returns<WeeklyPaymentStatusRow[]>();

  const rows = statusRows ?? [];

  // Map user_id → order_id so confirm/reject can target the order.
  const { data: orderRows } = await sb
    .from("orders")
    .select("id, user_id")
    .eq("week_plan_id", weekId)
    .returns<Pick<OrderRow, "id" | "user_id">[]>();
  const orderByUser = new Map((orderRows ?? []).map((o) => [o.user_id, o.id]));

  // Latest payment per order — for slip_path (view omits it). Fetch all payments
  // for these orders and keep the most recent per order (ADR-0009).
  const orderIds = (orderRows ?? []).map((o) => o.id);
  const slipByOrder = new Map<string, string | null>();
  if (orderIds.length > 0) {
    const { data: payRows } = await sb
      .from("payments")
      .select("order_id, slip_path, submitted_at, method")
      .in("order_id", orderIds)
      .order("submitted_at", { ascending: false })
      .returns<Pick<PaymentRow, "order_id" | "slip_path" | "submitted_at" | "method">[]>();
    for (const p of payRows ?? []) {
      // first seen per order = latest (rows are desc by submitted_at)
      if (!slipByOrder.has(p.order_id)) {
        slipByOrder.set(p.order_id, p.method === "slip" ? p.slip_path : null);
      }
    }
  }

  const lines: PaymentLine[] = rows.map((r) => {
    const orderId = orderByUser.get(r.user_id) ?? null;
    return {
      userId: r.user_id,
      displayName: r.display_name,
      orderId,
      days: r.days,
      amount: r.amount,
      method: r.method,
      status: r.status,
      slipPath: orderId ? slipByOrder.get(orderId) ?? null : null,
    };
  });

  // Summary totals.
  const paidCount = rows.filter((r) => r.status === "confirmed").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const owedCount = rows.filter((r) => r.status !== "confirmed").length;
  const totalConfirmed = rows
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const days = weekDates(week.week_start);
  const dateRange = `${thaiDayMonth(days[0])} – ${thaiDayMonth(days[4])}`;

  return (
    <div className="-mx-3 -my-4">
      <AppBar title="คิวชำระเงิน" subtitle={dateRange} backHref="/admin" />
      <div className="space-y-4 px-3 py-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="ยืนยันแล้ว" value={String(paidCount)} tone="leaf" />
          <Stat label="รอตรวจ" value={String(pendingCount)} tone="yolk" />
          <Stat label="ค้าง" value={String(owedCount)} tone="chili" />
          <Stat label="รวมที่ได้รับ" value={formatTHB(totalConfirmed)} tone="ink" />
        </div>

        <PaymentsClient weekId={weekId} lines={lines} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "leaf" | "yolk" | "chili" | "ink";
}) {
  const toneClass: Record<typeof tone, string> = {
    leaf: "text-leaf",
    yolk: "text-yolk-ink",
    chili: "text-chili",
    ink: "text-ink",
  };
  return (
    <Card className="px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${toneClass[tone]}`}>{value}</p>
    </Card>
  );
}
