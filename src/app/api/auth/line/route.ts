import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifyLineIdToken } from "@/lib/line/verifyIdToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { mintSessionToken } from "@/lib/auth/jwt";
import { serverEnv } from "@/lib/env";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  getCurrentUser,
} from "@/lib/auth/session";
import type { AppUser, UserRole } from "@/lib/types";

/**
 * LINE → Supabase session handshake (ADR-0002, ADR-0008).
 *
 * POST { idToken } : verify with LINE → upsert/claim the Member via the admin
 * client → mint a Supabase-compatible JWT → set the lp_session httpOnly cookie.
 * GET : return the current Member, or 401.
 */

// Never statically optimize an auth endpoint.
export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let profile;
  try {
    profile = await verifyLineIdToken(parsed.data.idToken);
  } catch (e) {
    // Bad / expired / forged token.
    console.error("[auth/line] verify failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "invalid_id_token" }, { status: 401 });
  }

  let user: AppUser;
  try {
    user = await resolveOrCreateMember(profile.lineUserId, profile.displayName, profile.pictureUrl);
  } catch (e) {
    const err = e as { code?: string; message?: string; details?: string; hint?: string };
    // Code first so it survives log-column truncation (e.g. PGRST106, 42501, PGRST205).
    console.error(`DBERR code=${err?.code} msg=${err?.message} details=${err?.details} hint=${err?.hint}`);
    return NextResponse.json({ error: "user_provisioning_failed", code: err?.code, message: err?.message }, { status: 500 });
  }

  try {
    const token = await mintSessionToken({
      userId: user.id,
      appRole: user.role,
      lineUserId: user.lineUserId,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions);
  } catch (e) {
    console.error("[auth/line] session mint failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "session_mint_failed" }, { status: 500 });
  }

  return NextResponse.json({ user });
}

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

/**
 * Resolve the Member behind a LINE account, creating one on first login.
 *
 * ADR-0008 (roster claim): an Admin may pre-create unclaimed roster rows
 * (line_user_id IS NULL) by name. On first login we should LINK the LINE account
 * to a matching unclaimed roster row instead of creating a duplicate.
 *
 * Automatic name-based matching is ambiguous and therefore an admin-assisted
 * step. For now we implement the unambiguous paths:
 *   1. A row already claimed by this line_user_id  → use it.
 *   2. No such row                                 → create a fresh member row
 *      (line_user_id + claimed_at = now), admin if seeded.
 *
 * TODO(ADR-0008): admin-assisted matching of a new LINE login to an UNCLAIMED
 * roster row (line_user_id IS NULL) — surface unclaimed rows to an admin UI and
 * let them link, rather than always inserting a new member here.
 */
async function resolveOrCreateMember(
  lineUserId: string,
  displayName: string | null,
  pictureUrl: string | null,
): Promise<AppUser> {
  const supabase = createAdminClient();

  // 1. Already claimed by this LINE account?
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id, line_user_id, display_name, picture_url, role")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    // Refresh profile fields from LINE (display name / avatar may change).
    // display_name is NOT NULL in the DB → only overwrite when LINE gave us one.
    const patch: { display_name?: string; picture_url: string | null } = {
      picture_url: pictureUrl,
    };
    if (displayName) patch.display_name = displayName;

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(patch)
      .eq("id", existing.id as string)
      .select("id, line_user_id, display_name, picture_url, role")
      .single();

    if (updateError) throw updateError;
    return toAppUser(updated);
  }

  // 2. First login → create a new member row, claimed now.
  const role: UserRole = serverEnv.adminLineUserIds().includes(lineUserId)
    ? "admin"
    : "member";

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      line_user_id: lineUserId,
      display_name: displayName ?? "สมาชิก", // display_name is NOT NULL in DB
      picture_url: pictureUrl,
      role,
      claimed_at: new Date().toISOString(),
    })
    .select("id, line_user_id, display_name, picture_url, role")
    .single();

  if (insertError) throw insertError;
  return toAppUser(created);
}

function toAppUser(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    lineUserId: (row.line_user_id as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    pictureUrl: (row.picture_url as string | null) ?? null,
    role: row.role as UserRole,
  };
}
