/** Amount = number of ordered days × price per day. */
export function calcAmount(days: number, pricePerDay: number): number {
  return Math.max(0, days) * pricePerDay;
}

/** "100 บาท" */
export function formatTHB(amount: number): string {
  return `${amount.toLocaleString("th-TH")} บาท`;
}
