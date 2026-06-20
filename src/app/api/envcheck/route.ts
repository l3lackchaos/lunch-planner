export const dynamic = "force-dynamic";

/**
 * TEMP, SECRET-SAFE env/connectivity check. Returns only booleans/lengths and the
 * REST status — never echoes any key value or error message that could contain a
 * secret. Remove after verifying.
 */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const jwt = process.env.SUPABASE_JWT_SECRET ?? "";
  const schema = process.env.NEXT_PUBLIC_DB_SCHEMA ?? "public";

  const out: Record<string, unknown> = {
    urlOk: /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url),
    dbSchema: schema,
    serviceKeyOk: key.trim().startsWith("sb_secret_") && key.trim().length > 20,
    serviceKeyLen: key.trim().length,
    jwtOk: jwt.trim().length > 20,
    jwtTrimLen: jwt.trim().length,
    jwtHadWhitespace: /\s/.test(jwt),
    liffIdOk: (process.env.NEXT_PUBLIC_LIFF_ID ?? "").includes("-"),
  };

  try {
    const r = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": schema,
      },
    });
    out.restStatus = r.status;
    out.restOk = r.ok;
  } catch (e) {
    // Only the error NAME — never the message (it may contain the key value).
    out.restStatus = "threw";
    out.restErrName = (e as Error)?.name;
  }

  return Response.json(out);
}
