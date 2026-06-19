import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  /** ไอคอนนำ (lucide หรือ EggIcon) */
  icon?: React.ReactNode;
  title: string;
  /** คำแนะนำว่าทำอะไรต่อ */
  description?: string;
  /** ปุ่ม/ลิงก์ call-to-action */
  action?: React.ReactNode;
  className?: string;
}

/**
 * สถานะว่าง — บอกว่าเกิดอะไรขึ้น + แนะนำขั้นต่อไป (เป็น "คำเชิญให้ลงมือ" ไม่ใช่แค่แจ้งว่าว่าง)
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 grid size-14 place-items-center rounded-full border border-border bg-paper text-muted">
          {icon}
        </div>
      )}
      <p className="text-base font-bold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
