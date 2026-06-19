"use client";

import { useState } from "react";
import { CalendarX2, Search as SearchIcon, Inbox } from "lucide-react";
import {
  AppBar,
  AmountSummary,
  Button,
  Card,
  CardBody,
  CardHeader,
  DayCard,
  DayCardSkeleton,
  EmptyState,
  EggIcon,
  EggPicker,
  OrderGridCell,
  SearchInput,
  SegmentedControl,
  Skeleton,
  StatusChip,
  type EggValue,
  type OrderCell,
  type PaymentStatus,
} from "@/components/ui";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// ── ข้อมูลตัวอย่างสะท้อนกลุ่มจริง (สัปดาห์ 22–26 มิ.ย. 2026) ──────────────
type SampleDay = {
  weekday: string;
  date: string;
  menu: string;
  proposer: string;
  holiday?: boolean;
  initialEating: boolean;
  initialEgg: EggValue;
};

const SAMPLE_WEEK: SampleDay[] = [
  {
    weekday: "จ",
    date: "22 มิ.ย.",
    menu: "ข้าวกะเพราไก่ไข่ดาว",
    proposer: "พี่แอน",
    initialEating: true,
    initialEgg: { egg: "boiled", doneness: "well" },
  },
  {
    weekday: "อ",
    date: "23 มิ.ย.",
    menu: "ข้าวราดแกงเขียวหวาน",
    proposer: "พี่อีฟ",
    initialEating: true,
    initialEgg: { egg: "fried", doneness: "soft" },
  },
  {
    weekday: "พ",
    date: "24 มิ.ย.",
    menu: "ข้าวผัดหมู",
    proposer: "มิ้ง",
    initialEating: true,
    initialEgg: { egg: "omelette" },
  },
  {
    weekday: "พฤ",
    date: "25 มิ.ย.",
    menu: "ข้าวหมูทอดกระเทียม",
    proposer: "พี่ชุ",
    initialEating: true,
    initialEgg: { egg: "none" },
  },
  {
    weekday: "ศ",
    date: "26 มิ.ย.",
    menu: "—",
    proposer: "",
    holiday: true,
    initialEating: false,
    initialEgg: { egg: "boiled", doneness: "well" },
  },
];

const ALL_STATUSES: PaymentStatus[] = [
  "unpaid",
  "pending",
  "confirmed",
  "rejected",
];

// Order Grid ตัวอย่าง — สมาชิก × จ–ศ
const GRID_ROWS: { name: string; cells: OrderCell[] }[] = [
  {
    name: "พี่แอน",
    cells: [
      { kind: "egg", egg: "boiled" },
      { kind: "egg", egg: "boiled" },
      { kind: "egg", egg: "boiled" },
      { kind: "no-egg" },
      { kind: "holiday" },
    ],
  },
  {
    name: "มิ้ง",
    cells: [
      { kind: "egg", egg: "fried", doneness: "soft" },
      { kind: "not-eating" },
      { kind: "egg", egg: "omelette" },
      { kind: "egg", egg: "fried", doneness: "well" },
      { kind: "holiday" },
    ],
  },
  {
    name: "พี่ชุ",
    cells: [
      { kind: "not-eating" },
      { kind: "not-eating" },
      { kind: "not-eating" },
      { kind: "not-eating" },
      { kind: "holiday" },
    ],
  },
];

export default function PreviewPage() {
  const [days, setDays] = useState(
    SAMPLE_WEEK.map((d) => ({
      eating: d.initialEating,
      egg: d.initialEgg,
    })),
  );
  const [solo, setSolo] = useState<EggValue>({ egg: "fried", doneness: "soft" });
  const [seg, setSeg] = useState<"slip" | "cash">("slip");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const orderedDays = days.filter((d, i) => d.eating && !SAMPLE_WEEK[i].holiday)
    .length;
  const PRICE = 20;

  return (
    <div className="min-h-dvh bg-paper">
      <AppBar
        title="Design System Preview"
        subtitle="โรงอาหารออฟฟิศ · 22–26 มิ.ย. 2026"
        onBack={() => {}}
        trailing={<StatusChip status="confirmed" size="sm" />}
      />

      <main className="mx-auto max-w-md space-y-10 px-4 py-6 pb-32">
        {/* Buttons */}
        <Section title="Button" hint="primary / secondary / ghost / danger · ≥44px">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">บันทึกออเดอร์</Button>
            <Button variant="secondary">แก้ไข</Button>
            <Button variant="ghost">ยกเลิก</Button>
            <Button variant="danger">ปฏิเสธ</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">เล็ก</Button>
            <Button size="md">กลาง</Button>
            <Button size="lg">ใหญ่</Button>
            <Button loading>กำลังบันทึก</Button>
            <Button disabled>ปิดรับแล้ว</Button>
          </div>
          <Button
            variant="primary"
            fullWidth
            leadingIcon={<EggIcon kind="fried" className="size-5" />}
          >
            เลือกครบ 5 วัน
          </Button>
        </Section>

        {/* Status chips */}
        <Section
          title="StatusChip"
          hint="เทา=ยังไม่แจ้ง · เหลือง=รอตรวจ · เขียว=ยืนยัน · แดง=ปฏิเสธ"
        >
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
          <StatusChip status="rejected" label="ปฏิเสธ — สลิปไม่ชัด" />
        </Section>

        {/* Search */}
        <Section title="SearchInput" hint="debounce 250ms · ปุ่มล้าง · ไม่สนตัวพิมพ์/ช่องว่าง">
          <SearchInput
            aria-label="ค้นหาชื่อสมาชิก"
            onDebouncedChange={(norm) => setQuery(norm)}
          />
          <p className="text-xs text-muted">
            ค่าค้นหา (normalize):{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-ink">
              {query || "—"}
            </code>
          </p>
        </Section>

        {/* SegmentedControl */}
        <Section title="SegmentedControl" hint="generic · ใช้ซ้ำใน EggPicker">
          <SegmentedControl
            aria-label="วิธีชำระเงิน"
            value={seg}
            onChange={setSeg}
            options={[
              { value: "slip", label: "อัปสลิป" },
              { value: "cash", label: "เงินสด" },
            ]}
          />
        </Section>

        {/* EggPicker standalone */}
        <Section
          title="EggPicker"
          hint="ต้ม/ดาว/เจียว/ไม่เอา + สุก/ไม่สุก (เฉพาะต้ม·ดาว)"
        >
          <Card>
            <CardBody>
              <EggPicker value={solo} onChange={setSolo} />
              <p className="mt-3 text-xs text-muted">
                ค่า: <code className="text-ink">{JSON.stringify(solo)}</code>
              </p>
            </CardBody>
          </Card>
        </Section>

        {/* Egg icons */}
        <Section title="EggIcon" hint="ไอคอนวาดเอง 4 ชนิด">
          <div className="flex gap-4 rounded-card border border-border bg-card p-4">
            {(["boiled", "fried", "omelette", "none"] as const).map((k) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <EggIcon kind={k} className="size-8 text-yolk" />
                <span className="text-xs text-muted">{k}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* DayCards — สัปดาห์ตัวอย่าง จ–ศ + วันหยุด */}
        <Section
          title="DayCard"
          hint="signature · กิน/ไม่กิน/ไม่ทานไข่/วันหยุด แยกชัด"
        >
          <div className="space-y-3">
            {SAMPLE_WEEK.map((d, i) => (
              <DayCard
                key={d.weekday}
                weekdayLabel={d.weekday}
                dateLabel={d.date}
                menuName={d.menu}
                proposer={d.proposer}
                holiday={d.holiday}
                eating={days[i].eating}
                onEatingChange={(eating) =>
                  setDays((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, eating } : p)),
                  )
                }
                eggValue={days[i].egg}
                onEggChange={(egg) =>
                  setDays((prev) =>
                    prev.map((p, idx) => (idx === i ? { ...p, egg } : p)),
                  )
                }
              />
            ))}
          </div>
        </Section>

        {/* Order Grid cells */}
        <Section
          title="OrderGridCell"
          hint="ตารางสรุป · สีแยกสถานะ · ไฮไลต์คนไม่กินทั้งสัปดาห์"
        >
          <Card className="overflow-hidden">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="border-b border-border bg-paper">
                  <th className="p-2 text-left font-semibold text-muted">ชื่อ</th>
                  {["จ", "อ", "พ", "พฤ", "ศ"].map((d) => (
                    <th key={d} className="p-2 font-semibold text-muted">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRID_ROWS.map((row) => {
                  const allSkip = row.cells.every(
                    (c) => c.kind === "not-eating" || c.kind === "holiday",
                  );
                  return (
                    <tr
                      key={row.name}
                      className={allSkip ? "bg-chili/[0.06]" : undefined}
                    >
                      <td className="whitespace-nowrap p-1.5 text-left font-medium text-ink">
                        {row.name}
                      </td>
                      {row.cells.map((c, i) => (
                        <td key={i} className="p-1">
                          <OrderGridCell cell={c} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted">
            แถวไฮไลต์แดงจาง = สมาชิกที่ &quot;ไม่กิน&quot; ทั้งสัปดาห์
          </p>
        </Section>

        {/* Card primitives */}
        <Section title="Card">
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-ink">หัวการ์ด</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted">
                พื้นผิวมาตรฐาน bg-card / border-border / rounded-card
              </p>
            </CardBody>
          </Card>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton" hint="โหลดการ์ดวัน (ไม่ใช้ spinner เต็มจอ)">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton shape="circle" className="size-8" />
            </div>
            <DayCardSkeleton />
          </div>
        </Section>

        {/* EmptyState */}
        <Section title="EmptyState">
          <Card>
            <EmptyState
              icon={<CalendarX2 className="size-6" aria-hidden />}
              title="ยังไม่มีแพลนสัปดาห์นี้"
              description="รอแอดมินเปิดรับออเดอร์ แล้วกลับมาเลือกวัน + ไข่ได้เลย"
              action={<Button variant="secondary">รีเฟรช</Button>}
            />
          </Card>
          <Card>
            <EmptyState
              icon={<SearchIcon className="size-6" aria-hidden />}
              title={'ไม่พบ "แอนนา"'}
              description="ลองพิมพ์ชื่อให้สั้นลง หรือตรวจการสะกด"
            />
          </Card>
        </Section>

        {/* AppBar variants */}
        <Section title="AppBar" hint="มีปุ่มย้อนกลับ / ไม่มี">
          <div className="overflow-hidden rounded-card border border-border">
            <AppBar
              title="เลือกออเดอร์"
              subtitle="22–26 มิ.ย. 2026"
              backHref="#"
              sticky={false}
            />
          </div>
          <div className="overflow-hidden rounded-card border border-border">
            <AppBar
              title="สัปดาห์นี้"
              sticky={false}
              trailing={
                <span className="grid size-9 place-items-center rounded-full bg-yolk text-sm font-bold text-yolk-ink">
                  อ
                </span>
              }
            />
          </div>
        </Section>

        <Section
          title="Loading toggle"
          hint="ลองสลับเพื่อดู skeleton vs ปุ่ม loading"
        >
          <Button
            variant="ghost"
            leadingIcon={<Inbox className="size-5" aria-hidden />}
            onClick={() => setLoading((v) => !v)}
          >
            {loading ? "ปิด loading demo" : "เปิด loading demo"}
          </Button>
          {loading && <DayCardSkeleton />}
        </Section>
      </main>

      {/* Sticky summary ล่างจอ */}
      <AmountSummary
        days={orderedDays}
        pricePerDay={PRICE}
        action={
          <Button variant="primary" size="lg">
            บันทึกออเดอร์
          </Button>
        }
      />
    </div>
  );
}
