import { z } from "zod";
import { serverEnv } from "@/lib/env";
import type { VerifiedLineProfile } from "@/lib/types";

/**
 * Verify a LINE ID token server-side (ADR-0002).
 *
 * Posts the token to LINE's verify endpoint, which checks the signature, `exp`,
 * and that `aud` matches our LINE Login channel id. Returns the trusted profile.
 * Never trust an ID token decoded on the client.
 */

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

/** Shape of LINE's verify response (subset we use). */
const lineVerifyResponseSchema = z.object({
  /** LINE userId. */
  sub: z.string().min(1),
  /** Audience — must equal our channel id. */
  aud: z.string().min(1),
  /** Expiry (epoch seconds). */
  exp: z.number(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineProfile> {
  if (!idToken) {
    throw new Error("Missing LINE ID token");
  }

  const channelId = serverEnv.lineLoginChannelId();

  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    // Always hit LINE fresh; never cache an auth check.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`LINE token verification failed (HTTP ${res.status})`);
  }

  const parsed = lineVerifyResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Unexpected LINE verify response shape");
  }

  const claims = parsed.data;

  // Defense-in-depth: LINE already validates aud/exp, but re-check ours.
  if (claims.aud !== channelId) {
    throw new Error("LINE ID token audience mismatch");
  }
  if (claims.exp * 1000 <= Date.now()) {
    throw new Error("LINE ID token expired");
  }

  return {
    lineUserId: claims.sub,
    displayName: claims.name ?? null,
    pictureUrl: claims.picture ?? null,
  };
}
