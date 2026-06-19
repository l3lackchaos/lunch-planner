import Link from "next/link";
import { CalendarPlus, ClipboardList, Receipt, Table2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { WeekPlanRow, WeekStatus } from "@/lib/db/types";
import { Button, Card, EmptyState } from "@/components/ui";
import { thaiDayMonth, weekDates } from "@/lib/date";
import { formatTHB } from "@/lib/money";
import { createWeekPlanAction } from "./week/[weekId]/actions";

export const dynamic = "force-dynamic";

// สถานะรอบบิล → ป้ายภาษาไทย + สีโทเคน (ไม่พึ่งสีอย่างเดียว: มีข้อความเสมอ)
const WEEK_STATUS: Record<WeekStatus, { label: string; className: string }> = {
  draft: { label: "ร่าง", className: "bg-muted/12 text-muted border-border" },
  open: { label: "เปิดรับสั่ง", className: "bg-leaf/12 text-leaf border-leaf/35" },
  closed: { label: "ปิดรับแล้ว", className: "bg-yolk/15 text-yolk-ink border-yolk/40" },
  billed: { label: "ออกบิลแล้ว", className: "bg-ink/[0.06] text-ink border-border" },
};

function WeekStatusChip({ status }: { status: WeekStatus }) {
  const meta = WEEK_STATUS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default async function AdminHomePage() {
  await requireAdmin();
  const sb = await createServerClient();

  const { data } = await sb
    .from("week_plans")
    .select("*")
    .order("week_start", { ascending: false });
  const weeks = (data ?? []) as WeekPlanRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">รอบบิลรายสัปดาห์</h1>
          <p className="text-sm text-muted">จัดการแพลนสัปดาห์ จ–ศ และการเก็บเงิน</p>
        </div>
        {/* สร้างสัปดาห์ใหม่ — server action สร้าง week_plan ของ "จันทร์หน้า" แล้ว redirect ไปหน้าจัดการ */}
        <form action={createWeekPlanAction}>
          <Button type="submit" size="sm" leadingIcon={<CalendarPlus className="size-4" aria-hidden />}>
            สร้างสัปดาห์ใหม่
          </Button>
        </form>
      </div>

      {weeks.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" aria-hidden />}
          title="ยังไม่มีรอบบิล"
          description="เริ่มต้นด้วยการสร้างสัปดาห์ใหม่ (จ–ศ) แล้วตั้งราคา/วันและเปิดให้สมาชิกสั่ง"
          action={
            <form action={createWeekPlanAction}>
              <Button type="submit" leadingIcon={<CalendarPlus className="size-4" aria-hidden />}>
                สร้างสัปดาห์ใหม่
              </Button>
            </form>
          }
        />
      ) : (
        <ul className="space-y-3">
          {weeks.map((w) => {
            const dates = weekDates(w.week_start);
            const rangeLabel = `${thaiDayMonth(dates[0])} – ${thaiDayMonth(dates[4])}`;
            return (
              <li key={w.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/week/${w.id}`}
                        className="text-base font-bold text-ink underline-offset-2 hover:underline"
                      >
                        สัปดาห์ {rangeLabel}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatTHB(w.price_per_day)}/วัน
                        {w.note ? ` · ${w.note}` : ""}
                      </p>
                    </div>
                    <WeekStatusChip status={w.status} />
                  </div>

                  {/* ลิงก์ลัดไปยังหน้าจัดการต่าง ๆ ของสัปดาห์นี้ */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <QuickLink href={`/admin/week/${w.id}`} icon={<ClipboardList className="size-4" aria-hidden />}>
                      จัดการรอบ
                    </QuickLink>
                    <QuickLink href="/admin/menus" icon={<CalendarPlus className="size-4" aria-hidden />}>
                      เมนู
                    </QuickLink>
                    <QuickLink href={`/admin/payments/${w.id}`} icon={<Receipt className="size-4" aria-hidden />}>
                      เก็บเงิน
                    </QuickLink>
                    <QuickLink href={`/admin/summary/${w.id}`} icon={<Table2 className="size-4" aria-hidden />}>
                      สรุป
                    </QuickLink>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-touch
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-paper"
    >
      {icon}
      {children}
    </Link>
  );
}
