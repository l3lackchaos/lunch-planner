import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUser, SessionClaims } from "@/lib/types";

/**
 * Server-side session helpers. The session is a Supabase-compatible JWT stored
 * in an httpOnly cookie. We verify it (signature + exp) on every server read.
 */

export const SESSION_COOKIE = "lp_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // ~7 days, matches JWT expiry

/** Cookie options shared by the route handler that sets/clears the session. */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

/** Read the raw session token from the request cookie, if present. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Verify the cookie and return decoded claims, or null if absent/invalid. */
export async function getSession(): Promise<SessionClaims | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Resolve the current authenticated Member to a full `AppUser`.
 * Uses the admin client to read the row by id (the row itself is already
 * authenticated by the verified JWT `sub`).
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, line_user_id, display_name, picture_url, role")
    .eq("id", session.sub)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    lineUserId: (data.line_user_id as string | null) ?? null,
    displayName: (data.display_name as string | null) ?? null,
    pictureUrl: (data.picture_url as string | null) ?? null,
    role: data.role as AppUser["role"],
  };
}
