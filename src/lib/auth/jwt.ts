import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { serverEnv } from "@/lib/env";
import type { SessionClaims, UserRole } from "@/lib/types";

/**
 * Mint / verify Supabase-compatible session JWTs (ADR-0002).
 *
 * Signed HS256 with SUPABASE_JWT_SECRET so Supabase/PostgREST accepts it and RLS
 * sees `auth.uid()` = `sub` = users.id. We add custom claims `app_role` and
 * `line_user_id` for application-level authorization.
 */

const ISSUER = "lunch-planner";
const AUDIENCE = "authenticated";
const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // ~7 days

function secretKey(): Uint8Array {
  return new TextEncoder().encode(serverEnv.supabaseJwtSecret());
}

export interface MintInput {
  /** users.id (uuid). */
  userId: string;
  appRole: UserRole;
  lineUserId: string | null;
}

export async function mintSessionToken(input: MintInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    role: "authenticated",
    app_role: input.appRole,
    line_user_id: input.lineUserId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + EXPIRY_SECONDS)
    .sign(secretKey());
}

/** Verify a session token and return its claims, or throw if invalid/expired. */
export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    audience: AUDIENCE,
    issuer: ISSUER,
  });
  return toSessionClaims(payload);
}

function toSessionClaims(payload: JWTPayload): SessionClaims {
  const sub = payload.sub;
  const appRole = payload.app_role;
  if (typeof sub !== "string" || !isUserRole(appRole)) {
    throw new Error("Invalid session token claims");
  }
  const lineUserId = payload.line_user_id;
  return {
    sub,
    role: "authenticated",
    app_role: appRole,
    line_user_id: typeof lineUserId === "string" ? lineUserId : null,
  };
}

function isUserRole(value: unknown): value is UserRole {
  return value === "member" || value === "cook" || value === "admin";
}
