"use client";

import { useMemo, useState, useTransition } from "react";
import { Receipt, Image as ImageIcon } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  SearchInput,
  SegmentedControl,
  StatusChip,
  normalizeQuery,
  type PaymentStatus,
} from "@/components/ui";
import { formatTHB } from "@/lib/money";
import type { PayMethod, PayStatus } from "@/lib/db/types";
import { confirmPayment, rejectPayment, getSlipUrl } from "./actions";

/** One member's payment line for the week (joined with their order id + slip). */
export interface PaymentLine {
  userId: string;
  displayName: string;
  orderId: string | null;
  days: number;
  amount: number | null;
  method: PayMethod | null;
  status: PayStatus | null;
  slipPath: string | null;
}

type StatusFilter = "all" | "pending" | "confirmed" | "owed";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจ" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "owed", label: "ค้าง" },
];

/** Map DB pay status → chip status; null/unpaid + rejected count as "owed". */
function chipStatus(status: PayStatus | null): PaymentStatus {
  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  if (status === "rejected") return "rejected";
  return "unpaid";
}

/** "owed" bucket = nothing confirmed yet (unpaid / pending / rejected). */
function isOwed(status: PayStatus | null): boolean {
  return status !== "confirmed";
}

const methodLabel: Record<PayMethod, string> = { slip: "สลิป", cash: "เงินสด" };

export function PaymentsClient({
  weekId,
  lines,
}: {
  weekId: string;
  lines: PaymentLine[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    return lines.filter((l) => {
      if (q && !normalizeQuery(l.displayName).includes(q)) return false;
      if (filter === "pending") return l.status === "pending";
      if (filter === "confirmed") return l.status === "confirmed";
      if (filter === "owed") return isOwed(l.status);
      return true;
    });
  }, [lines, query, filter]);

  return (
    <div className="space-y-4">
      <SearchInput
        aria-label="ค้นหาชื่อสมาชิก"
        placeholder="ค้นหาชื่อสมาชิก…"
        onDebouncedChange={(normalized) => setQuery(normalized)}
        onChange={(raw) => raw === "" && setQuery("")}
      />

      <SegmentedControl
        aria-label="กรองตามสถานะการชำระเงิน"
        options={STATUS_FILTERS}
        value={filter}
        onChange={setFilter}
        size="sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-6" aria-hidden />}
          title="ไม่พบรายการ"
          description="ลองล้างคำค้นหรือเปลี่ยนตัวกรองสถานะ"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((line) => (
            <PaymentRowCard key={line.userId} weekId={weekId} line={line} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentRowCard({ weekId, line }: { weekId: string; line: PaymentLine }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  // slip viewer
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipLoading, setSlipLoading] = useState(false);

  const canAct = line.orderId !== null && line.status === "pending";

  function onConfirm() {
    if (!line.orderId) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmPayment({ orderId: line.orderId, weekId });
      if (!res.ok) setError(res.error);
    });
  }

  function onReject() {
    if (!line.orderId) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectPayment({ orderId: line.orderId, weekId, reason });
      if (!res.ok) {
        setError(res.error);
      } else {
        setRejecting(false);
        setReason("");
      }
    });
  }

  async function viewSlip() {
    if (!line.slipPath) return;
    setError(null);
    if (slipUrl) {
      setSlipOpen(true);
      return;
    }
    setSlipLoading(true);
    const res = await getSlipUrl(line.slipPath);
    setSlipLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSlipUrl(res.url);
    setSlipOpen(true);
  }

  return (
    <Card as="li" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{line.displayName}</p>
          <p className="mt-0.5 text-sm text-muted">
            {line.days} วัน
            {line.method ? ` · ${methodLabel[line.method]}` : ""}
            {line.amount != null ? ` · ${formatTHB(line.amount)}` : ""}
          </p>
        </div>
        <StatusChip status={chipStatus(line.status)} size="sm" />
      </div>

      {(line.method === "slip" && line.slipPath) || canAct ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {line.method === "slip" && line.slipPath && (
            <Button
              variant="secondary"
              size="sm"
              loading={slipLoading}
              leadingIcon={<ImageIcon className="size-4" aria-hidden />}
              onClick={viewSlip}
            >
              ดูสลิป
            </Button>
          )}
          {canAct && !rejecting && (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={pending}
                onClick={onConfirm}
              >
                ยืนยัน
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => setRejecting(true)}
              >
                ปฏิเสธ
              </Button>
            </>
          )}
        </div>
      ) : null}

      {rejecting && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <label
            htmlFor={`reason-${line.userId}`}
            className="block text-sm font-medium text-ink"
          >
            เหตุผลที่ปฏิเสธ (จำเป็น)
          </label>
          <textarea
            id={`reason-${line.userId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="เช่น ยอดไม่ตรง / สลิปไม่ชัด"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[15px] text-ink outline-none focus:ring-2 focus:ring-ink"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              disabled={reason.trim().length === 0}
              onClick={onReject}
            >
              ยืนยันการปฏิเสธ
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="border-t border-border px-4 py-2 text-sm text-chili" role="alert">
          {error}
        </p>
      )}

      {slipOpen && slipUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`สลิปของ ${line.displayName}`}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4"
          onClick={() => setSlipOpen(false)}
        >
          <div
            className="max-h-[85vh] max-w-full overflow-auto rounded-card bg-card p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slipUrl}
              alt={`สลิปการชำระเงินของ ${line.displayName}`}
              className="mx-auto h-auto max-h-[78vh] w-auto max-w-full rounded-lg"
            />
            <div className="mt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSlipOpen(false)}>
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
