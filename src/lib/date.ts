/**
 * Week / date helpers. A "week" is Monday–Friday (the consumption week).
 * Orders are pre-paid: the deadline is the Thursday BEFORE week_start (ADR-0007).
 */
import {
  addDays,
  addMonths,
  format,
  getISODay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

/** First day (YYYY-MM-DD) of the month containing `d` (or today). */
export function firstOfMonth(d: Date = new Date()): string {
  return format(startOfMonth(d), "yyyy-MM-dd");
}

/** First day (YYYY-MM-DD) of the month AFTER the one containing `d` (default: next month). */
export function nextMonthFirst(d: Date = new Date()): string {
  return format(startOfMonth(addMonths(d, 1)), "yyyy-MM-dd");
}

/** YYYY-MM-DD for a Date (local). */
export function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Parse a YYYY-MM-DD string into a Date (noon, to dodge TZ edges). */
export function fromDateStr(s: string): Date {
  return parseISO(`${s}T12:00:00`);
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** ISO weekday 1=Mon … 7=Sun. We only use 1..5. */
export function weekdayOf(d: Date): number {
  return getISODay(d);
}

/** The 5 working dates (Mon–Fri) of a week, given its Monday (Date or string). */
export function weekDates(weekStart: Date | string): string[] {
  const monday = typeof weekStart === "string" ? fromDateStr(weekStart) : weekStart;
  return Array.from({ length: 5 }, (_, i) => toDateStr(addDays(monday, i)));
}

/**
 * Order deadline = the Thursday BEFORE the consumption week (ADR-0007).
 * week_start is a Monday → its Thursday-before is 4 days earlier.
 */
export function deadlineThursdayBefore(weekStart: Date | string): Date {
  const monday = typeof weekStart === "string" ? fromDateStr(weekStart) : weekStart;
  return subDays(monday, 4); // Mon - 4 = previous Thursday
}

const TH_WEEKDAY_SHORT = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
const TH_WEEKDAY_LETTER = ["", "จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

export function thaiWeekdayShort(weekday: number): string {
  return TH_WEEKDAY_SHORT[weekday] ?? "";
}
export function thaiWeekdayLetter(weekday: number): string {
  return TH_WEEKDAY_LETTER[weekday] ?? "";
}

/** e.g. "22 มิ.ย." */
const TH_MONTH_ABBR = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
export function thaiDayMonth(d: Date | string): string {
  const date = typeof d === "string" ? fromDateStr(d) : d;
  return `${date.getDate()} ${TH_MONTH_ABBR[date.getMonth()]}`;
}

/** Buddhist-era year label for a month, e.g. "มิถุนายน 2569". */
const TH_MONTH_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export function thaiMonthYear(d: Date | string): string {
  const date = typeof d === "string" ? fromDateStr(d) : d;
  return `${TH_MONTH_FULL[date.getMonth()]} ${date.getFullYear() + 543}`;
}
