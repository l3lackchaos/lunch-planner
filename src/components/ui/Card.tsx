import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** ระดับการยกขึ้น — flat (ไม่มีเงา) หรือ raised (เงาบาง) */
  elevation?: "flat" | "raised";
  as?: React.ElementType;
}

/**
 * พื้นผิวการ์ดมาตรฐาน — สไตล์ "ใบสั่งอาหาร/กระดานเมนู"
 * ใช้ token: bg-card / border-border / rounded-card
 */
export function Card({
  elevation = "raised",
  as: Tag = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-border bg-card",
        elevation === "raised" && "shadow-[0_1px_2px_rgba(35,32,28,0.06),0_4px_12px_-6px_rgba(35,32,28,0.10)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pt-4 pb-2", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-border px-4 py-3", className)}
      {...props}
    />
  );
}
