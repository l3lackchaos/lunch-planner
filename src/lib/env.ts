/**
 * Typed, LAZY environment accessors.
 *
 * Rules:
 * - Nothing here reads or validates env at import/build time. Every value is read
 *   inside a function and only throws when actually called at runtime.
 * - Public vars (NEXT_PUBLIC_*) are inlined by Next at build time and are safe to
 *   reference on the client. Server-only vars must never be imported into client code.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/* ───────── Public (client-safe) ───────── */

export const publicEnv = {
  /** LIFF app id — used by the browser LIFF SDK. */
  liffId(): string {
    return required("NEXT_PUBLIC_LIFF_ID", process.env.NEXT_PUBLIC_LIFF_ID);
  },
  supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  supabaseAnonKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
} as const;

/* ───────── Server-only (never import from client components) ───────── */

export const serverEnv = {
  lineLoginChannelId(): string {
    return required("LINE_LOGIN_CHANNEL_ID", process.env.LINE_LOGIN_CHANNEL_ID);
  },
  lineLoginChannelSecret(): string {
    return required("LINE_LOGIN_CHANNEL_SECRET", process.env.LINE_LOGIN_CHANNEL_SECRET);
  },
  supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  supabaseJwtSecret(): string {
    return required("SUPABASE_JWT_SECRET", process.env.SUPABASE_JWT_SECRET);
  },
  /** LINE userIds (comma-separated) seeded as admins on first login. */
  adminLineUserIds(): string[] {
    return (process.env.ADMIN_LINE_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
} as const;
