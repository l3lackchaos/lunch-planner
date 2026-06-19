"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Banknote, X } from "lucide-react";
import { Button, Card, SegmentedControl } from "@/components/ui";
import { formatTHB } from "@/lib/money";
import { submitPayment } from "./actions";

type Method = "slip" | "cash";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface PaymentFormProps {
  orderId: string;
  amount: number;
  canSubmit: boolean;
  isResubmit: boolean;
}

export function PaymentForm({
  orderId,
  amount,
  canSubmit,
  isResubmit,
}: PaymentFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<Method>("slip");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!canSubmit) {
    return (
      <Card className="p-4 text-sm text-muted">
        ส่งคำขอแล้ว — รอแอดมินตรวจสอบ ไม่ต้องส่งซ้ำ
      </Card>
    );
  }

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      setError("รองรับเฉพาะไฟล์รูปภาพ (JPG/PNG/WEBP)");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onSubmit() {
    setError(null);
    if (method === "slip" && !file) {
      setError("กรุณาแนบรูปสลิป");
      return;
    }
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("method", method);
    if (method === "slip" && file) fd.set("slip", file);

    startTransition(async () => {
      const res = await submitPayment(fd);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">วิธีชำระเงิน</p>
        <SegmentedControl<Method>
          aria-label="เลือกวิธีชำระเงิน"
          value={method}
          onChange={(m) => {
            setMethod(m);
            setError(null);
          }}
          options={[
            {
              value: "slip",
              label: "แนบสลิป",
              icon: <ImageUp className="size-4" aria-hidden />,
            },
            {
              value: "cash",
              label: "เงินสด",
              icon: <Banknote className="size-4" aria-hidden />,
            },
          ]}
        />
      </div>

      {method === "slip" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="ตัวอย่างสลิป"
                className="max-h-72 w-full object-contain bg-paper"
              />
              <button
                type="button"
                onClick={() => pickFile(null)}
                aria-label="ลบรูป"
                data-touch
                className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-ink/70 text-paper outline-none focus-visible:ring-2 focus-visible:ring-paper"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              data-touch
              className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-paper text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ink"
            >
              <ImageUp className="size-7" aria-hidden />
              <span className="text-sm font-medium">แตะเพื่อถ่าย/เลือกรูปสลิป</span>
            </button>
          )}
        </div>
      )}

      {method === "cash" && (
        <p className="rounded-lg bg-paper px-3 py-2 text-sm text-muted">
          แจ้งชำระด้วยเงินสด — แอดมินจะยืนยันเมื่อรับเงินจริง
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-chili/10 px-3 py-2 text-sm text-chili">
          {error}
        </p>
      )}

      <Button fullWidth onClick={onSubmit} loading={pending} disabled={pending}>
        {isResubmit ? "แจ้งชำระอีกครั้ง" : "แจ้งชำระเงิน"} · {formatTHB(amount)}
      </Button>
    </Card>
  );
}
