import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Per-request Supabase client for normal data access (ADR-0002).
 *
 * Uses the anon key and attaches the minted session JWT (from the lp_session
 * cookie) as the Authorization header, so Postgres RLS evaluates
 * `auth.uid() = users.id`. If there is no session, the client is anon-only and
 * RLS will reject member-scoped reads — which is the desired safe default.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const token = await getSessionToken();

  return createSupabaseClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
