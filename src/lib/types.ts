/**
 * Hand-written shared types for the auth / LIFF layer.
 * The domain noun is "Member" (CONTEXT.md); the auth/account record is `users`.
 */

/** Application-level role (custom JWT claim `app_role`). */
export type UserRole = "member" | "cook" | "admin";

/** The authenticated account record (`users` row) as exposed to the client. */
export interface AppUser {
  /** users.id (uuid) — becomes the JWT `sub` / `auth.uid()`. */
  id: string;
  /** LINE userId (the `sub` of the verified LINE ID token). Nullable until claimed. */
  lineUserId: string | null;
  /** Display name from LINE profile. */
  displayName: string | null;
  /** Avatar URL from LINE profile. */
  pictureUrl: string | null;
  /** Application role; drives authorization in RLS + server code. */
  role: UserRole;
}

/** Result of verifying a LINE ID token against LINE's verify endpoint. */
export interface VerifiedLineProfile {
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
}

/** Decoded claims carried by our Supabase-compatible session JWT. */
export interface SessionClaims {
  /** users.id */
  sub: string;
  /** Always "authenticated" so Supabase/PostgREST treats it as a logged-in role. */
  role: "authenticated";
  /** Application role. */
  app_role: UserRole;
  /** LINE userId for convenience / auditing. */
  line_user_id: string | null;
}
