import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** แสดง spinner และปิดการกดชั่วคราว */
  loading?: boolean;
  /** ไอคอนนำหน้าข้อความ */
  leadingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  // ไข่แดง = CTA หลัก
  primary:
    "bg-yolk text-yolk-ink shadow-sm hover:brightness-[0.97] active:brightness-95",
  // กระดาษ/ขอบ — รอง
  secondary:
    "bg-card text-ink border border-border hover:bg-paper active:bg-paper",
  // โปร่ง — ใช้กับ action เบา ๆ
  ghost: "bg-transparent text-ink hover:bg-black/[0.04] active:bg-black/[0.07]",
  // พริก = อันตราย/ปฏิเสธ
  danger: "bg-chili text-paper shadow-sm hover:brightness-95 active:brightness-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  // min-h ครบ 44px ทุกขนาดเพื่อ touch target บนมือถือ
  sm: "min-h-[44px] px-3 text-sm gap-1.5 rounded-lg",
  md: "min-h-[44px] px-4 text-[15px] gap-2 rounded-xl",
  lg: "min-h-[52px] px-5 text-base gap-2 rounded-xl",
};

/**
 * ปุ่มหลักของระบบ — touch target ≥44px, มี loading state,
 * focus ring มองเห็นชัดเพื่อ a11y
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    fullWidth = false,
    className,
    disabled,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      data-touch
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold leading-none",
        "transition-[filter,background-color] duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-[1.15em] animate-spin" aria-hidden />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  );
});
