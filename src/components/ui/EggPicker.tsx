"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { EggIcon, type EggKind } from "./EggIcon";

export type Doneness = "well" | "soft";

export interface EggValue {
  egg: EggKind;
  /** ระดับสุก — เฉพาะ ต้ม/ดาว; undefined ถ้าไม่เกี่ยวข้อง */
  doneness?: Doneness;
}

export interface EggPickerProps {
  value: EggValue;
  onChange: (value: EggValue) => void;
  className?: string;
  disabled?: boolean;
}

const EGGS: { value: EggKind; label: string }[] = [
  { value: "boiled", label: "ต้ม" },
  { value: "fried", label: "ดาว" },
  { value: "omelette", label: "เจียว" },
  { value: "none", label: "ไม่เอา" },
];

/** ไข่ที่ระบุระดับสุกได้ (ต้ม/ดาว) */
const SUPPORTS_DONENESS: EggKind[] = ["boiled", "fried"];

const DONENESS: { value: Doneness; label: string }[] = [
  { value: "well", label: "สุก" },
  { value: "soft", label: "ไม่สุก" },
];

/**
 * เลือกชนิดไข่แบบ segmented — ต้ม / ดาว / เจียว / ไม่เอา
 * เมื่อเลือก ต้ม หรือ ดาว จะมี sub-toggle สุก/ไม่สุก ปรากฏ
 * Controlled: value `{ egg, doneness }`, onChange
 * a11y: radiogroup + ลูกศรคีย์บอร์ด + touch ≥44px + ฟีดแบ็คสีไข่แดงทันที
 */
export function EggPicker({
  value,
  onChange,
  className,
  disabled = false,
}: EggPickerProps) {
  const groupId = useId();
  const showDoneness = SUPPORTS_DONENESS.includes(value.egg);

  function selectEgg(egg: EggKind) {
    if (SUPPORTS_DONENESS.includes(egg)) {
      // คงค่าสุกเดิม หรือ default = สุก
      onChange({ egg, doneness: value.doneness ?? "well" });
    } else {
      onChange({ egg });
    }
  }

  function selectDoneness(doneness: Doneness) {
    onChange({ egg: value.egg, doneness });
  }

  function moveEgg(dir: 1 | -1, from: number) {
    const next = EGGS[(from + dir + EGGS.length) % EGGS.length];
    selectEgg(next.value);
    requestAnimationFrame(() =>
      document.getElementById(`${groupId}-egg-${next.value}`)?.focus(),
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <div
        role="radiogroup"
        aria-label="เลือกชนิดไข่"
        className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-paper p-1"
      >
        {EGGS.map((opt, index) => {
          const selected = value.egg === opt.value;
          return (
            <button
              key={opt.value}
              id={`${groupId}-egg-${opt.value}`}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`ไข่${opt.label}`}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              data-touch
              onClick={() => selectEgg(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  moveEgg(1, index);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  moveEgg(-1, index);
                }
              }}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 transition-[background-color,color,box-shadow] duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
                "disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? opt.value === "none"
                    ? "bg-card text-muted shadow-sm ring-1 ring-border"
                    : "bg-yolk text-yolk-ink shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              <EggIcon kind={opt.value} className="size-7" />
              <span className="text-xs font-semibold">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {showDoneness && (
        <div className="flex items-center gap-2 pl-0.5">
          <span className="text-xs font-medium text-muted">ระดับ</span>
          <div
            role="radiogroup"
            aria-label="ระดับความสุกของไข่"
            className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-border bg-paper p-1"
          >
            {DONENESS.map((d) => {
              const selected = value.doneness === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`ไข่${d.label}`}
                  disabled={disabled}
                  data-touch
                  onClick={() => selectDoneness(d.value)}
                  className={cn(
                    "min-h-[44px] rounded-md px-2 text-sm font-medium transition-[background-color,color] duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ink",
                    "disabled:opacity-40",
                    selected
                      ? "bg-leaf/15 text-leaf ring-1 ring-leaf/35"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
