"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDebounced } from "./useDebounced";

export interface SearchInputProps {
  /** ค่าเริ่มต้น (uncontrolled) */
  defaultValue?: string;
  placeholder?: string;
  /** ป้ายสำหรับ screen reader */
  "aria-label"?: string;
  /** ดีเลย์ debounce (ms) — default 250 */
  delay?: number;
  /** เรียกเมื่อค่าหยุดนิ่งครบ debounce — รับค่าที่ normalize แล้ว (lowercase + ตัดช่องว่างหัวท้าย) */
  onDebouncedChange?: (normalized: string, raw: string) => void;
  /** เรียกทุกครั้งที่พิมพ์ (raw) */
  onChange?: (raw: string) => void;
  className?: string;
  autoFocus?: boolean;
}

/** normalize สำหรับค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และข้ามช่องว่าง */
export function normalizeQuery(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * ช่องค้นหาชื่อสมาชิก — แว่นขยายนำหน้า, ปุ่มล้าง (×), debounce ~250ms
 * ส่งค่า normalize ออกผ่าน onDebouncedChange (case/space-insensitive friendly)
 */
export function SearchInput({
  defaultValue = "",
  placeholder = "ค้นหาชื่อ…",
  delay = 250,
  onDebouncedChange,
  onChange,
  className,
  autoFocus,
  ...aria
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const debounced = useDebounced(value, delay);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    onDebouncedChange?.(normalizeQuery(debounced), debounced);
    // เรียกเฉพาะเมื่อค่า debounce เปลี่ยน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function clear() {
    setValue("");
    onChange?.("");
    inputRef.current?.focus();
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card",
        "px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-paper",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
      <input
        ref={inputRef}
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={value}
        aria-label={aria["aria-label"] ?? placeholder}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
        }}
        className={cn(
          "w-full bg-transparent py-2 text-[15px] text-ink outline-none",
          "placeholder:text-muted",
          // ซ่อน clear ของ webkit (เราใช้ปุ่มเอง)
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={clear}
          aria-label="ล้างคำค้นหา"
          data-touch
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-muted",
            "hover:bg-black/[0.05] active:bg-black/[0.08]",
            "outline-none focus-visible:ring-2 focus-visible:ring-ink",
          )}
        >
          <X className="size-[18px]" aria-hidden />
        </button>
      )}
    </div>
  );
}
