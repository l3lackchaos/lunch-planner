import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Server-only admin client using the service-role key (BYPASSES RLS).
 *
 * Use ONLY for the login upsert / roster claim (ADR-0008), where we must read &
 * link rows before a session JWT exists. Never expose this to the browser and
 * never use it for normal request-scoped data access — use supabase/server.ts.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
