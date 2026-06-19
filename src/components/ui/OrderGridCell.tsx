import { cn } from "@/lib/cn";
import { EggIcon, type EggKind } from "./EggIcon";

/** เนื้อหาในช่องตารางสรุป (Order Grid) ต่อ สมาชิก × วัน */
export type OrderCell =
  | { kind: "egg"; egg: Exclude<EggKind, "none">; doneness?: "well" | "soft" }
  | { kind: "no-egg" } // ไม่ทานไข่ (egg = none) — สั่งข้าว
  | { kind: "not-eating" } // ไม่กิน — ไม่มี order item
  | { kind: "holiday" };

const EGG_LABEL: Record<Exclude<EggKind, "none">, string> = {
  boiled: "ต้ม",
  fried: "ดาว",
  omelette: "เจียว",
};

function label(cell: OrderCell): string {
  switch (cell.kind) {
    case "egg": {
      const base = EGG_LABEL[cell.egg];
      if (cell.egg === "fried" && cell.doneness)
        return `ดาว${cell.doneness === "well" ? "สุก" : "ไม่สุก"}`;
      if (cell.egg === "boiled" && cell.doneness)
        return `ต้ม${cell.doneness === "well" ? "สุก" : "ไม่สุก"}`;
      return base;
    }
    case "no-egg":
      return "ไม่ทานไข่";
    case "not-eating":
      return "ไม่กิน";
    case "holiday":
      return "หยุด";
  }
}

/**
 * ช่องในตารางสรุปรายสัปดาห์ — สีแยกสถานะให้อ่านง่าย, ไม่พึ่งสีอย่างเดียว (มีข้อความเสมอ)
 * - ไข่: พื้นไข่แดงอ่อน + ไอคอนไข่
 * - ไม่ทานไข่: neutral
 * - ไม่กิน: เทาจาง (ไฮไลต์คนไม่กิน)
 * - วันหยุด: hatch
 */
export function OrderGridCell({
  cell,
  className,
}: {
  cell: OrderCell;
  className?: string;
}) {
  const styles: Record<OrderCell["kind"], string> = {
    egg: "bg-yolk/15 text-yolk-ink border-yolk/30",
    "no-egg": "bg-card text-ink border-border",
    "not-eating": "bg-muted/12 text-muted border-border",
    holiday:
      "text-muted border-border bg-[repeating-linear-gradient(45deg,var(--color-border),var(--color-border)_4px,transparent_4px,transparent_8px)]",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] w-full items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        styles[cell.kind],
        className,
      )}
    >
      {cell.kind === "egg" && (
        <EggIcon kind={cell.egg} className="size-3.5" />
      )}
      <span>{label(cell)}</span>
    </span>
  );
}
