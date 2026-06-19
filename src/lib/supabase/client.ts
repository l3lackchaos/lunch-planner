"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Browser Supabase client (anon key). For client-side reads subject to RLS.
 * The session is established via our own httpOnly cookie + minted JWT, so this
 * client is mostly used for realtime / lightweight anon-scoped reads.
 */
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      publicEnv.supabaseUrl(),
      publicEnv.supabaseAnonKey(),
      { db: { schema: publicEnv.dbSchema() } },
    ) as unknown as SupabaseClient;
  }
  return browserClient;
}
