import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { MenuRow, UserRow } from "@/lib/db/types";
import {
  fromDateStr,
  thaiMonthYear,
  thaiWeekdayShort,
  toDateStr,
  weekdayOf,
} from "@/lib/date";

export const dynamic = "force-dynamic";

function resolveMonth(monthParam: string | undefined): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    return fromDateStr(`${monthParam}-01`);
  }
  const now = new Date();
  return fromDateStr(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
}

function monthWorkingDates(monthStart: Date): string[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const dates: string[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    const wd = weekdayOf(cursor);
    if (wd >= 1 && wd <= 5) dates.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function proposerLabel(
  menu: MenuRow,
  members: Pick<UserRow, "id" | "display_name">[],
): string | null {
  if (menu.proposed_by_user_id) {
    return members.find((m) => m.id === menu.proposed_by_user_id)?.display_name ?? null;
  }
  return menu.proposed_by_name ?? null;
}

export default async function MenuPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month } = await searchParams;
  const sb = await createServerClient();

  const monthStart = resolveMonth(month);
  const dates = monthWorkingDates(monthStart);
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const [{ data: menuData }, { data: memberData }] = await Promise.all([
    sb.from("menus").select("*").gte("menu_date", rangeStart).lte("menu_date", rangeEnd),
    sb.from("users").select("id, display_name"),
  ]);
  const menus = (menuData ?? []) as MenuRow[];
  const members = (memberData ?? []) as Pick<UserRow, "id" | "display_name">[];
  const byDate: Record<string, MenuRow> = {};
  for (const m of menus) byDate[m.menu_date] = m;

  return (
    <div className="mx-auto max-w-md print:max-w-none">
      {/* แถบนำทาง — ซ่อนตอนพิมพ์ */}
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        <a href={`/admin/menus?month=${rangeStart.slice(0, 7)}`} className="text-sm text-muted hover:text-ink">
          ← กลับไปแก้ไข
        </a>
        <p className="text-xs text-muted">
          พิมพ์/บันทึกรูป: กด <kbd className="rounded border border-border px-1">Ctrl/Cmd + P</kbd>{" "}
          แล้วเลือกพิมพ์ หรือบันทึกเป็น PDF/รูป
        </p>
      </div>

      {/* ใบปฏิทินสำหรับโพสต์ในกลุ่ม */}
      <article className="rounded-card border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
        <header className="mb-3 text-center">
          <h1 className="text-lg font-bold text-ink">เมนูกลางวัน</h1>
          <p className="text-sm text-muted">{thaiMonthYear(monthStart)}</p>
        </header>

        <ul className="divide-y divide-border">
          {dates.map((date) => {
            const menu = byDate[date];
            const d = fromDateStr(date);
            const wd = weekdayOf(d);
            const isHoliday = menu?.is_holiday ?? false;
            const proposer = menu && !isHoliday ? proposerLabel(menu, members) : null;
            return (
              <li key={date} className="flex items-start gap-3 py-2">
                <div className="w-14 shrink-0">
                  <div className="text-sm font-bold text-ink">
                    {thaiWeekdayShort(wd)} {d.getDate()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {isHoliday ? (
                    <span className="text-sm font-medium text-muted">— วันหยุด —</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-ink">{menu?.name || "ยังไม่กำหนด"}</span>
                      {menu?.description && (
                        <span className="block text-xs text-muted">{menu.description}</span>
                      )}
                    </>
                  )}
                </div>
                {proposer && (
                  <div className="shrink-0 text-xs text-muted">โดย {proposer}</div>
                )}
              </li>
            );
          })}
        </ul>
      </article>

      <style>{`
        @media print {
          /* พิมพ์ขาว–ดำสะอาด ตรงกับที่โพสต์ในกลุ่ม */
          body { background: #fff !important; }
          nav, header.sticky { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
