import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AppBarProps {
  title: string;
  /** ข้อความรองใต้/ข้างชื่อ เช่น ช่วงวันที่ของสัปดาห์ */
  subtitle?: string;
  /** แสดงปุ่มย้อนกลับ */
  onBack?: () => void;
  backHref?: string;
  /** slot ฝั่งขวา เช่น เมนู/avatar */
  trailing?: React.ReactNode;
  /** ติดบนสุด (default true) */
  sticky?: boolean;
  className?: string;
}

/**
 * แถบหัวแอป — ชื่อหน้า + ปุ่มย้อนกลับ (optional) + slot ขวา
 * sticky บนสุด, รองรับ safe-area ของ notch ในมือถือ
 */
export function AppBar({
  title,
  subtitle,
  onBack,
  backHref,
  trailing,
  sticky = true,
  className,
}: AppBarProps) {
  const showBack = Boolean(onBack || backHref);

  const backButton = showBack &&
    (backHref ? (
      <a
        href={backHref}
        role="button"
        aria-label="ย้อนกลับ"
        data-touch
        className="-ml-2 grid size-11 place-items-center rounded-full text-ink outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-ink"
      >
        <ChevronLeft className="size-6" aria-hidden />
      </a>
    ) : (
      <button
        type="button"
        onClick={onBack}
        aria-label="ย้อนกลับ"
        data-touch
        className="-ml-2 grid size-11 place-items-center rounded-full text-ink outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-ink"
      >
        <ChevronLeft className="size-6" aria-hidden />
      </button>
    ));

  return (
    <header
      className={cn(
        "z-30 border-b border-border bg-paper/90 backdrop-blur",
        "supports-[backdrop-filter]:bg-paper/75",
        sticky && "sticky top-0",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex min-h-[52px] items-center gap-2 px-3">
        {backButton}
        <div className={cn("min-w-0 flex-1", !showBack && "pl-1")}>
          <h1 className="truncate text-[17px] font-bold leading-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted">{subtitle}</p>
          )}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </header>
  );
}
