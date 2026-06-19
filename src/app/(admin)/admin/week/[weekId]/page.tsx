import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { WeekPlanRow, WeekStatus } from "@/lib/db/types";
import { Button, Card } from "@/components/ui";
import { thaiDayMonth, weekDates } from "@/lib/date";
import { updateWeekPlanAction, setWeekStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_ORDER: WeekStatus[] = ["draft", "open", "closed", "billed"];
const STATUS_LABEL: Record<WeekStatus, string> = {
  draft: "ร่าง",
  open: "เปิดรับสั่ง",
  closed: "ปิดรับแล้ว",
  billed: "ออกบิลแล้ว",
};
// ปุ่มเดินหน้าหนึ่งขั้น (label ของ action)
const ADVANCE_LABEL: Partial<Record<WeekStatus, string>> = {
  draft: "เปิดให้สั่ง",
  open: "ปิดรับ",
  closed: "ออกบิล/เก็บเงิน",
};

function fmtDeadline(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  // วันพฤหัสก่อนสัปดาห์ (ADR-0007) — แสดงวันที่แบบไทย
  return thaiDayMonth(d);
}

export default async function WeekPlanPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  await requireAdmin();
  const { weekId } = await params;
  const sb = await createServerClient();

  const { data } = await sb.from("week_plans").select("*").eq("id", weekId).maybeSingle();
  if (!data) notFound();
  const week = data as WeekPlanRow;

  const dates = weekDates(week.week_start);
  const rangeLabel = `${thaiDayMonth(dates[0])} – ${thaiDayMonth(dates[4])}`;
  const curIdx = STATUS_ORDER.indexOf(week.status);
  const nextStatus = STATUS_ORDER[curIdx + 1];
  const prevStatus = STATUS_ORDER[curIdx - 1];

  return (
    <div className="space-y-4">
      <div>
        <a href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> หน้าหลัก
        </a>
        <h1 className="mt-1 text-lg font-bold text-ink">สัปดาห์ {rangeLabel}</h1>
      </div>

      {/* รายละเอียด + deadline (อ่านอย่างเดียว — คำนวณจาก week_start) */}
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">วันจันทร์ของสัปดาห์</dt>
            <dd className="font-medium text-ink">{thaiDayMonth(week.week_start)}</dd>
          </div>
          <div>
            <dt className="text-muted">เส้นตายชำระ (พฤหัสก่อน)</dt>
            <dd className="flex items-center gap-1 font-medium text-ink">
              <CalendarDays className="size-4 text-muted" aria-hidden />
              {fmtDeadline(week.order_deadline)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">สถานะปัจจุบัน</dt>
            <dd className="font-medium text-ink">{STATUS_LABEL[week.status]}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          เก็บเงินล่วงหน้า: เส้นตาย = วันพฤหัสก่อนสัปดาห์ที่กิน (คำนวณอัตโนมัติจากวันจันทร์)
        </p>
      </Card>

      {/* แก้ราคา/วัน + หมายเหตุ */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">ราคาและหมายเหตุ</h2>
        <form action={updateWeekPlanAction} className="space-y-3">
          <input type="hidden" name="weekId" value={week.id} />
          <div>
            <label htmlFor="pricePerDay" className="mb-1 block text-sm text-muted">
              ราคา/วัน (บาท)
            </label>
            <input
              id="pricePerDay"
              name="pricePerDay"
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              defaultValue={week.price_per_day}
              className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
            />
          </div>
          <div>
            <label htmlFor="note" className="mb-1 block text-sm text-muted">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              defaultValue={week.note ?? ""}
              placeholder="เช่น สัปดาห์นี้มีวันหยุด"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
            />
          </div>
          <Button type="submit" fullWidth>
            บันทึก
          </Button>
        </form>
      </Card>

      {/* เปลี่ยนสถานะ draft→open→closed→billed (+ ย้อนหนึ่งขั้น/reopen) */}
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold text-ink">สถานะรอบบิล</h2>
        <p className="mb-3 text-xs text-muted">
          {STATUS_ORDER.map((s) => STATUS_LABEL[s]).join(" → ")}
        </p>
        <div className="flex flex-wrap gap-2">
          {prevStatus && (
            <form action={setWeekStatusAction}>
              <input type="hidden" name="weekId" value={week.id} />
              <input type="hidden" name="next" value={prevStatus} />
              <Button type="submit" variant="secondary" leadingIcon={<ArrowLeft className="size-4" aria-hidden />}>
                ย้อนกลับเป็น “{STATUS_LABEL[prevStatus]}”
              </Button>
            </form>
          )}
          {nextStatus && (
            <form action={setWeekStatusAction}>
              <input type="hidden" name="weekId" value={week.id} />
              <input type="hidden" name="next" value={nextStatus} />
              <Button type="submit" leadingIcon={<ArrowRight className="size-4" aria-hidden />}>
                {ADVANCE_LABEL[week.status] ?? `ไปยัง “${STATUS_LABEL[nextStatus]}”`}
              </Button>
            </form>
          )}
          {!nextStatus && !prevStatus && (
            <p className="text-sm text-muted">ไม่มีการเปลี่ยนสถานะที่ทำได้</p>
          )}
        </div>
      </Card>
    </div>
  );
}
