import {
  CircleDashed,
  Clock,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/** สถานะการชำระเงิน (ตรงกับ docs: pending → confirmed | rejected, + ยังไม่แจ้ง) */
export type PaymentStatus = "unpaid" | "pending" | "confirmed" | "rejected";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** สีพื้น + ตัวอักษร — ไม่พึ่งสีอย่างเดียว (มี label + icon เสมอ) */
  className: string;
}

const STATUS: Record<PaymentStatus, StatusMeta> = {
  // เทา = ยังไม่แจ้งชำระ
  unpaid: {
    label: "ยังไม่แจ้ง",
    icon: CircleDashed,
    className: "bg-paper text-muted border-border",
  },
  // เหลือง (yolk) = รอแอดมินตรวจ
  pending: {
    label: "รอตรวจ",
    icon: Clock,
    className: "bg-yolk/15 text-yolk-ink border-yolk/40",
  },
  // เขียว (leaf) = ยืนยันแล้ว
  confirmed: {
    label: "ยืนยันแล้ว",
    icon: CheckCircle2,
    className: "bg-leaf/12 text-leaf border-leaf/35",
  },
  // แดง (chili) = ปฏิเสธ
  rejected: {
    label: "ปฏิเสธ",
    icon: XCircle,
    className: "bg-chili/12 text-chili border-chili/35",
  },
};

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: PaymentStatus;
  size?: "sm" | "md";
  /** แทนที่ข้อความ default ได้ (เช่น เหตุผลที่ปฏิเสธแบบสั้น) */
  label?: string;
}

/**
 * ป้ายสถานะการชำระเงิน — สื่อด้วย ไอคอน + ข้อความ + สี (ไม่ใช้สีอย่างเดียว เพื่อ a11y)
 */
export function StatusChip({
  status,
  size = "md",
  label,
  className,
  ...props
}: StatusChipProps) {
  const meta = STATUS[status];
  const Icon = meta.icon;
  const text = label ?? meta.label;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]",
        meta.className,
        className,
      )}
      {...props}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      <span>{text}</span>
    </span>
  );
}
