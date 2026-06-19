import { cn } from "@/lib/cn";

export interface AmountSummaryProps {
  /** จำนวนวันที่สั่ง */
  days: number;
  /** ราคาต่อวัน (บาท) */
  pricePerDay: number;
  /** ปุ่ม/ปุ่มหลัก ฝั่งขวา */
  action?: React.ReactNode;
  /** ทำให้ติดขอบล่างจอ (default: true) */
  sticky?: boolean;
  className?: string;
}

const baht = new Intl.NumberFormat("th-TH");

/**
 * แถบสรุปยอดเงิน (sticky ล่างจอ) — จำนวนวัน × ราคา/วัน = ยอดรวม + slot ปุ่มหลัก
 * ตัวเลขใช้ tabular-nums เพื่อให้ยอดเงินเรียงสวย
 */
export function AmountSummary({
  days,
  pricePerDay,
  action,
  sticky = true,
  className,
}: AmountSummaryProps) {
  const total = days * pricePerDay;
  return (
    <div
      className={cn(
        "z-30 border-t border-border bg-card/95 backdrop-blur",
        "supports-[backdrop-filter]:bg-card/85",
        sticky && "sticky bottom-0",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted tabular-nums">
            {baht.format(days)} วัน × {baht.format(pricePerDay)} ฿
          </p>
          <p className="flex items-baseline gap-1 leading-tight">
            <span className="text-sm text-muted">ยอดรวม</span>
            <span className="text-2xl font-extrabold text-ink tabular-nums">
              {baht.format(total)}
            </span>
            <span className="text-sm font-semibold text-ink">฿</span>
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
