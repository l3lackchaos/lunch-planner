import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deadlineThursdayBefore,
  weekDates,
  weekdayOf,
  fromDateStr,
  toDateStr,
  firstOfMonth,
  nextMonthFirst,
} from "./date";
import { eggCellLabel, eggSupportsDoneness } from "./egg";
import { calcAmount, formatTHB } from "./money";

test("deadline is the Thursday before the consumption week (ADR-0007)", () => {
  // 2026-06-22 is a Monday; the Thursday before is 2026-06-18.
  assert.equal(toDateStr(deadlineThursdayBefore("2026-06-22")), "2026-06-18");
  assert.equal(weekdayOf(deadlineThursdayBefore("2026-06-22")), 4); // Thursday
});

test("weekDates returns Mon–Fri of the week", () => {
  assert.deepEqual(weekDates("2026-06-22"), [
    "2026-06-22",
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26",
  ]);
});

test("weekdayOf maps Mon..Fri to 1..5", () => {
  assert.equal(weekdayOf(fromDateStr("2026-06-22")), 1);
  assert.equal(weekdayOf(fromDateStr("2026-06-26")), 5);
});

test("egg cell labels incl. the two no-states (ADR-0005)", () => {
  assert.equal(eggCellLabel("none", null), "ไม่ทานไข่");
  assert.equal(eggCellLabel("fried", "soft"), "ดาวไม่สุก");
  assert.equal(eggCellLabel("fried", "well"), "ไข่ดาวสุก");
  assert.equal(eggCellLabel("fried", null), "ไข่ดาวสุก");
  assert.equal(eggCellLabel("boiled", null), "ต้ม");
  assert.equal(eggCellLabel("omelette", null), "ไข่เจียว");
});

test("doneness only applies to boiled/fried", () => {
  assert.equal(eggSupportsDoneness("boiled"), true);
  assert.equal(eggSupportsDoneness("fried"), true);
  assert.equal(eggSupportsDoneness("omelette"), false);
  assert.equal(eggSupportsDoneness("none"), false);
});

test("amount = days × price, floored at 0", () => {
  assert.equal(calcAmount(5, 20), 100);
  assert.equal(calcAmount(2, 20), 40);
  assert.equal(calcAmount(0, 20), 0);
  assert.equal(calcAmount(-3, 20), 0);
});

test("formatTHB renders Thai baht", () => {
  assert.equal(formatTHB(100), "100 บาท");
  assert.equal(formatTHB(0), "0 บาท");
});

test("month helpers for voting rounds", () => {
  assert.equal(firstOfMonth(fromDateStr("2026-06-19")), "2026-06-01");
  assert.equal(nextMonthFirst(fromDateStr("2026-06-19")), "2026-07-01");
  assert.equal(nextMonthFirst(fromDateStr("2026-12-10")), "2027-01-01");
});
