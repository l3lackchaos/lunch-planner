/**
 * Egg labels + the two "no" states (ADR-0005).
 * - no order item for a day  => "ไม่กิน"  (not eating, not charged)
 * - order item with egg=none => "ไม่ทานไข่" (eats, no egg)
 */
import type { EggDoneness, EggStyle } from "@/lib/db/types";

export const EGG_LABELS: Record<EggStyle, string> = {
  boiled: "ต้ม",
  fried: "ดาว",
  omelette: "เจียว",
  none: "ไม่เอาไข่",
};

export const DONENESS_LABELS: Record<EggDoneness, string> = {
  well: "สุก",
  soft: "ไม่สุก",
};

/** Label shown in summaries/grid for an actually-placed order item. */
export function eggCellLabel(egg: EggStyle, doneness: EggDoneness | null): string {
  if (egg === "none") return "ไม่ทานไข่";
  if (egg === "fried") return doneness === "soft" ? "ดาวไม่สุก" : "ไข่ดาวสุก";
  if (egg === "boiled") return "ต้ม";
  if (egg === "omelette") return "ไข่เจียว";
  return EGG_LABELS[egg];
}

/** Doneness only applies to boiled/fried. */
export function eggSupportsDoneness(egg: EggStyle): boolean {
  return egg === "boiled" || egg === "fried";
}

export const NOT_EATING_LABEL = "ไม่กิน";
