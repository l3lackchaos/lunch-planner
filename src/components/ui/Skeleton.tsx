import { cn } from "@/lib/cn";
import { Card } from "./Card";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** ทรง — กล่อง (default) หรือ วงกลม */
  shape?: "rect" | "circle";
}

/** บล็อกโหลด — พื้นฐาน */
export function Skeleton({ shape = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-border/70",
        shape === "circle" ? "rounded-full" : "rounded-md",
        className,
      )}
      {...props}
    />
  );
}

/**
 * โครงโหลดของการ์ดวัน — ใช้แทน spinner เต็มจอหลัง auth (ตาม docs)
 */
export function DayCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn("p-4", className)}
      aria-busy
      aria-label="กำลังโหลดเมนูของวัน"
      role="status"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-7 w-full rounded-lg" />
        </div>
      </div>
    </Card>
  );
}
