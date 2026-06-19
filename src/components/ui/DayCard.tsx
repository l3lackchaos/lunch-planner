"use client";

import { CalendarOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";
import { EggPicker, type EggValue } from "./EggPicker";
import { EggIcon } from "./EggIcon";

export interface DayCardProps {
  /** ป้ายวัน เช่น "จ", "อ" … หรือ "จันทร์" */
  weekdayLabel: string;
  /** วันที่จริง เช่น "22 มิ.ย." */
  dateLabel: string;
  /** ชื่อเมนูของวันนั้น */
  menuName: string;
  /** ชื่อคนเลือกเมนู (Proposer) — optional */
  proposer?: string;
  /** กำลังกินวันนี้หรือไม่ (มี Order Item) */
  eating: boolean;
  onEatingChange: (eating: boolean) => void;
  /** ค่าไข่ — ใช้เมื่อ eating = true */
  eggValue: EggValue;
  onEggChange: (value: EggValue) => void;
  /** วันหยุด — ปิดการสั่ง ไม่คิดเงิน */
  holiday?: boolean;
  className?: string;
}

const EGG_TH: Record<EggValue["egg"], string> = {
  boiled: "ไข่ต้ม",
  fried: "ไข่ดาว",
  omelette: "ไข่เจียว",
  none: "ไม่ทานไข่",
};

function eggSummary(v: EggValue): string {
  if (v.egg === "none") return "ไม่ทานไข่";
  const base = EGG_TH[v.egg];
  if ((v.egg === "boiled" || v.egg === "fried") && v.doneness) {
    return `${base} ${v.doneness === "well" ? "สุก" : "ไม่สุก"}`;
  }
  return base;
}

/**
 * การ์ดรายวันสไตล์ "ใบสั่งอาหาร" — signature element
 * - แถบสีซ้ายบอกสถานะ: กิน (yolk) / ไม่กิน (เส้นประ) / วันหยุด (hatch)
 * - toggle "กินวันนี้" → เปิด EggPicker
 * - แยก "ไม่กิน" (ไม่สั่งเลย) กับ "ไม่ทานไข่" (egg=none) ให้เห็นชัด
 */
export function DayCard({
  weekdayLabel,
  dateLabel,
  menuName,
  proposer,
  eating,
  onEatingChange,
  eggValue,
  onEggChange,
  holiday = false,
  className,
}: DayCardProps) {
  const noEgg = eating && eggValue.egg === "none";

  // สีแถบซ้าย = เครื่องหมายสถานะของใบสั่ง
  const accent = holiday
    ? "before:bg-[repeating-linear-gradient(45deg,var(--color-border),var(--color-border)_5px,transparent_5px,transparent_10px)]"
    : eating
      ? noEgg
        ? "before:bg-muted"
        : "before:bg-yolk"
      : "before:bg-[repeating-linear-gradient(180deg,var(--color-border),var(--color-border)_6px,transparent_6px,transparent_12px)]";

  return (
    <Card
      elevation={holiday ? "flat" : "raised"}
      className={cn(
        "relative overflow-hidden pl-4",
        // แถบสถานะด้านซ้าย (signature)
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        accent,
        holiday && "opacity-80",
        className,
      )}
      aria-disabled={holiday || undefined}
    >
      <div className="flex items-start gap-3 p-4">
        {/* บล็อกวัน — เหมือนหัวกระดานเมนู */}
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-lg border text-center leading-none",
            holiday
              ? "border-border bg-paper text-muted"
              : eating
                ? "border-yolk/40 bg-yolk/12 text-yolk-ink"
                : "border-border bg-paper text-ink",
          )}
        >
          <span className="text-base font-bold">{weekdayLabel}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted">{dateLabel}</span>
            {holiday && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-paper px-2 py-0.5 text-xs font-medium text-muted">
                <CalendarOff className="size-3.5" aria-hidden />
                วันหยุด
              </span>
            )}
          </div>

          <h3
            className={cn(
              "mt-0.5 truncate text-[17px] font-bold",
              holiday ? "text-muted" : "text-ink",
            )}
          >
            {holiday ? "หยุด — ไม่มีออเดอร์" : menuName}
          </h3>
          {!holiday && proposer && (
            <p className="truncate text-xs text-muted">โดย {proposer}</p>
          )}

          {/* toggle "กินวันนี้" — ซ่อนเมื่อวันหยุด */}
          {!holiday && (
            <label className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">
                {eating ? "กินวันนี้" : "ไม่กิน"}
              </span>
              <span className="sr-only">สลับการกินวันนี้</span>
              <button
                type="button"
                role="switch"
                aria-checked={eating}
                aria-label={eating ? "ยกเลิกการกินวันนี้" : "เลือกกินวันนี้"}
                data-touch
                onClick={() => onEatingChange(!eating)}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  eating
                    ? "border-leaf bg-leaf"
                    : "border-border bg-paper",
                )}
              >
                <span
                  className={cn(
                    "ml-0.5 inline-block size-5 rounded-full bg-card shadow transition-transform duration-150",
                    eating ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      {/* EggPicker — แสดงเมื่อกินวันนี้ */}
      {!holiday && eating && (
        <div className="border-t border-border bg-paper/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <EggIcon
              kind={eggValue.egg}
              className={cn(
                "size-5",
                eggValue.egg === "none" ? "text-muted" : "text-yolk",
              )}
            />
            <span className="text-sm font-medium text-ink">
              {eggSummary(eggValue)}
            </span>
            {noEgg && (
              <span className="ml-auto rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted">
                สั่งข้าว · ไม่เอาไข่
              </span>
            )}
          </div>
          <EggPicker value={eggValue} onChange={onEggChange} />
        </div>
      )}
    </Card>
  );
}
