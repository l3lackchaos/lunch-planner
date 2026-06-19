"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MenuRow, UserRow } from "@/lib/db/types";
import { thaiDayMonth } from "@/lib/date";
import { saveMenuAction, clearMenuAction } from "../actions";

type ProposerMode = "member" | "free";

export interface DayEditorProps {
  date: string; // YYYY-MM-DD
  menu?: MenuRow;
  members: Pick<UserRow, "id" | "display_name">[];
  onClose: () => void;
}

/**
 * Day editor modal — set name/description/image_url + proposer (hybrid) +
 * holiday toggle. Submits a Server Action, then refreshes + closes on success.
 */
export function DayEditor({ date, menu, members, onClose }: DayEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [isHoliday, setIsHoliday] = useState(menu?.is_holiday ?? false);
  const [proposerMode, setProposerMode] = useState<ProposerMode>(
    menu?.proposed_by_name && !menu?.proposed_by_user_id ? "free" : "member",
  );

  function runAction(action: (fd: FormData) => Promise<void>, fd: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(fd);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("menuDate", date);
    fd.set("isHoliday", isHoliday ? "true" : "");
    // Keep only the active proposer channel to avoid sending both.
    if (isHoliday || proposerMode !== "member") fd.set("proposedByUserId", "");
    if (isHoliday || proposerMode !== "free") fd.set("proposedByName", "");
    runAction(saveMenuAction, fd);
  }

  function onClear() {
    const fd = new FormData();
    fd.set("menuDate", date);
    runAction(clearMenuAction, fd);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`แก้เมนูวันที่ ${thaiDayMonth(date)}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-card bg-paper p-4 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">เมนูวันที่ {thaiDayMonth(date)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            data-touch
            className="grid size-11 place-items-center rounded-full text-muted hover:bg-black/[0.05]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* วันหยุด */}
        <label className="mb-3 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3">
          <input
            type="checkbox"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            className="size-5 accent-[var(--color-chili)]"
          />
          <span className="text-sm font-medium text-ink">วันหยุด (ไม่มีออเดอร์/ไม่คิดเงิน)</span>
        </label>

        <form onSubmit={onSave} className={cn("space-y-3", isHoliday && "opacity-50")}>
          <fieldset disabled={isHoliday} className="space-y-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm text-muted">
                ชื่อเมนู
              </label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={120}
                defaultValue={menu?.name ?? ""}
                placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว"
                className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm text-muted">
                รายละเอียด (ไม่บังคับ)
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                maxLength={500}
                defaultValue={menu?.description ?? ""}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <div>
              <label htmlFor="imageUrl" className="mb-1 block text-sm text-muted">
                ลิงก์รูป (ไม่บังคับ)
              </label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                maxLength={500}
                defaultValue={menu?.image_url ?? ""}
                placeholder="https://…"
                className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            {/* คนเลือก (hybrid) — เลือกสมาชิก หรือ พิมพ์ชื่อเอง */}
            <div>
              <span className="mb-1 block text-sm text-muted">คนเลือก (proposer)</span>
              <div
                role="radiogroup"
                aria-label="วิธีระบุคนเลือก"
                className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-border bg-paper p-1"
              >
                {(
                  [
                    { v: "member", label: "เลือกสมาชิก" },
                    { v: "free", label: "พิมพ์ชื่อเอง" },
                  ] as { v: ProposerMode; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={proposerMode === opt.v}
                    onClick={() => setProposerMode(opt.v)}
                    className={cn(
                      "min-h-[44px] rounded-lg text-sm font-medium",
                      proposerMode === opt.v
                        ? "bg-card text-ink shadow-sm ring-1 ring-border"
                        : "text-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {proposerMode === "member" ? (
                <select
                  name="proposedByUserId"
                  defaultValue={menu?.proposed_by_user_id ?? ""}
                  aria-label="เลือกสมาชิกที่เป็นคนเลือกเมนู"
                  className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <option value="">— เลือกสมาชิก —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="proposedByName"
                  type="text"
                  maxLength={80}
                  defaultValue={menu?.proposed_by_name ?? ""}
                  placeholder="พิมพ์ชื่อคนเลือก เช่น พี่อีฟ"
                  aria-label="ชื่อคนเลือก (พิมพ์เอง)"
                  className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
                />
              )}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-chili/12 px-3 py-2 text-sm text-chili">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {menu && (
              <Button type="button" variant="ghost" onClick={onClear} loading={pending}>
                ล้างวันนี้
              </Button>
            )}
            <Button type="submit" fullWidth loading={pending}>
              บันทึก
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
