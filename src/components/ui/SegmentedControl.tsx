"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** ป้ายกลุ่มสำหรับ screen reader */
  "aria-label": string;
  /** วางไอคอนเหนือข้อความ (เหมาะกับ EggPicker) แทนข้าง ๆ */
  stack?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Segmented control ทั่วไป — role="radiogroup" เต็มรูปแบบ
 * รองรับคีย์บอร์ด (ลูกศรเลื่อน) + touch ≥44px + ฟีดแบ็คสีทันที
 * แต่ละปุ่มเป็น role="radio" เพื่อ a11y ที่ถูกต้อง
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  stack = false,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const groupId = useId();

  function move(dir: 1 | -1, fromIndex: number) {
    const enabled = options
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.disabled);
    if (enabled.length === 0) return;
    const pos = enabled.findIndex(({ i }) => i === fromIndex);
    const next = enabled[(pos + dir + enabled.length) % enabled.length];
    onChange(next.o.value);
    // ย้ายโฟกัสไปปุ่มที่เลือกใหม่
    requestAnimationFrame(() => {
      document
        .getElementById(`${groupId}-${next.o.value}`)
        ?.focus();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(
        "grid gap-1 rounded-xl border border-border bg-paper p-1",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`,
      }}
    >
      {options.map((opt, index) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            id={`${groupId}-${opt.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            disabled={opt.disabled}
            tabIndex={selected || (value === undefined && index === 0) ? 0 : -1}
            data-touch
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1, index);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1, index);
              }
            }}
            className={cn(
              "flex min-h-[44px] items-center justify-center rounded-lg font-medium transition-[background-color,color,box-shadow] duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
              "disabled:cursor-not-allowed disabled:opacity-40",
              stack ? "flex-col gap-1 px-1 py-1.5" : "gap-1.5 px-2",
              size === "sm" ? "text-xs" : "text-sm",
              selected
                ? "bg-card text-ink shadow-sm ring-1 ring-border"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
