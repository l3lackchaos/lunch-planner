/**
 * Hand-written row types mirroring supabase/migrations/0001_init.sql.
 * (No live DB to generate from yet — keep these in sync with the migration.)
 */

export type UserRole = "member" | "cook" | "admin";
export type WeekStatus = "draft" | "open" | "closed" | "billed";
export type EggStyle = "boiled" | "fried" | "omelette" | "none";
export type EggDoneness = "well" | "soft";
export type PayMethod = "slip" | "cash";
export type PayStatus = "pending" | "confirmed" | "rejected";

export interface UserRow {
  id: string;
  line_user_id: string | null;
  display_name: string;
  picture_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_by_admin: boolean;
  claimed_at: string | null;
  created_at: string;
}

export interface WeekPlanRow {
  id: string;
  week_start: string; // date (YYYY-MM-DD)
  status: WeekStatus;
  price_per_day: number;
  order_deadline: string | null; // timestamptz
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MenuRow {
  id: string;
  menu_date: string; // date
  name: string | null;
  description: string | null;
  image_url: string | null;
  proposed_by_user_id: string | null;
  proposed_by_name: string | null;
  is_holiday: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  week_plan_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  weekday: number; // 1..5
  menu_date: string; // date
  egg: EggStyle;
  doneness: EggDoneness | null;
  note: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  amount: number;
  method: PayMethod;
  slip_path: string | null;
  status: PayStatus;
  submitted_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

// ── View rows ────────────────────────────────────────────────────────────────
export interface DailyEggSummaryRow {
  menu_date: string;
  egg: EggStyle;
  doneness: EggDoneness | null;
  qty: number;
}

export interface WeeklyOrderGridRow {
  user_id: string;
  display_name: string;
  menu_date: string;
  cell: string; // 'ไม่กิน' | 'ไม่ทานไข่' | 'ต้ม' | 'ไข่ดาวสุก' | 'ดาวไม่สุก' | 'ไข่เจียว'
  is_eating: boolean;
}

export interface DailyNotOrderedRow {
  menu_date: string;
  user_id: string;
  display_name: string;
}

export interface WeeklyPaymentStatusRow {
  week_plan_id: string;
  user_id: string;
  display_name: string;
  days: number;
  amount: number | null;
  method: PayMethod | null;
  status: PayStatus | null;
}

// ── Phase 6: voting (ADR-0011) ───────────────────────────────────────────────
export type VoteRoundStatus = "draft" | "open" | "closed";

export interface VoteRoundRow {
  id: string;
  target_month: string; // date (first of month)
  title: string | null;
  status: VoteRoundStatus;
  opens_at: string | null;
  closes_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MenuCandidateRow {
  id: string;
  round_id: string;
  name: string;
  description: string | null;
  proposed_by_user_id: string | null;
  proposed_by_name: string | null;
  created_at: string;
}

export interface VoteRow {
  id: string;
  round_id: string;
  candidate_id: string;
  user_id: string;
  created_at: string;
}

export interface CandidateVoteCountRow {
  round_id: string;
  candidate_id: string;
  name: string;
  votes: number;
}
