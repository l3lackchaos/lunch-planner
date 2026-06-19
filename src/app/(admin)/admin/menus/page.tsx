import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { MenuRow, UserRow } from "@/lib/db/types";
import { Button } from "@/components/ui";
import { fromDateStr, thaiMonthYear, toDateStr, weekdayOf } from "@/lib/date";
import { MenuCalendar } from "./components/MenuCalendar";

export const dynamic = "force-dynamic";

/** Parse ?month=YYYY-MM (default = current month). Returns first-of-month Date. */
function resolveMonth(monthParam: string | undefined): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    return fromDateStr(`${monthParam}-01`);
  }
  const now = new Date();
  return fromDateStr(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
}

function monthParamOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Working (Mon–Fri) dates of a month + leading blanks for column alignment. */
function monthWorkingDates(monthStart: Date): { dates: string[]; leadingBlanks: number } {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const dates: string[] = [];
  let leadingBlanks = 0;
  let first = true;
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    const wd = weekdayOf(cursor); // 1=Mon … 7=Sun
    if (wd >= 1 && wd <= 5) {
      if (first) {
        leadingBlanks = wd - 1; // blanks before the first working day
        first = false;
      }
      dates.push(toDateStr(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dates, leadingBlanks };
}

export default async function MenusPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month } = await searchParams;
  const sb = await createServerClient();

  const monthStart = resolveMonth(month);
  const { dates, leadingBlanks } = monthWorkingDates(monthStart);
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const [{ data: menuData }, { data: memberData }] = await Promise.all([
    sb.from("menus").select("*").gte("menu_date", rangeStart).lte("menu_date", rangeEnd),
    sb
      .from("users")
      .select("id, display_name")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
  ]);

  const menus = (menuData ?? []) as MenuRow[];
  const members = (memberData ?? []) as Pick<UserRow, "id" | "display_name">[];
  const menusByDate: Record<string, MenuRow> = {};
  for (const m of menus) menusByDate[m.menu_date] = m;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-ink">แพลนเมนู (ปฏิทินเดือน)</h1>
        <Link href={`/admin/menus/print?month=${monthParamOf(monthStart)}`}>
          <Button size="sm" variant="secondary" leadingIcon={<Printer className="size-4" aria-hidden />}>
            พิมพ์/แชร์
          </Button>
        </Link>
      </div>

      {/* นำทางเดือน */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/menus?month=${monthParamOf(prevMonth)}`}
          data-touch
          aria-label="เดือนก่อนหน้า"
          className="grid size-11 place-items-center rounded-full text-ink hover:bg-card"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <span className="text-base font-bold text-ink">{thaiMonthYear(monthStart)}</span>
        <Link
          href={`/admin/menus?month=${monthParamOf(nextMonth)}`}
          data-touch
          aria-label="เดือนถัดไป"
          className="grid size-11 place-items-center rounded-full text-ink hover:bg-card"
        >
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      </div>

      <MenuCalendar
        monthStart={toDateStr(monthStart)}
        workingDates={dates}
        leadingBlanks={leadingBlanks}
        menusByDate={menusByDate}
        members={members}
      />

      <p className="text-xs text-muted">
        แตะวันเพื่อตั้งชื่อเมนู คนเลือก รูป หรือทำเครื่องหมายวันหยุด (จ–ศ เท่านั้น)
      </p>
    </div>
  );
}
