export const dynamic = "force-dynamic";

/**
 * TEMP diagnostic route — confirms which env values the build received and whether
 * the serverless function can reach the Supabase REST API. Exposes NO secret values
 * (only booleans + the public URL). Remove after debugging.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schema = process.env.NEXT_PUBLIC_DB_SCHEMA ?? "public";
  const out: Record<string, unknown> = {
    supabaseUrl: url,
    dbSchema: schema,
    liffId: process.env.NEXT_PUBLIC_LIFF_ID,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").slice(0, 10),
    hasJwt: !!process.env.SUPABASE_JWT_SECRET,
    lineChannelId: process.env.LINE_LOGIN_CHANNEL_ID,
  };

  try {
    const r = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        "Accept-Profile": schema,
      },
    });
    out.restStatus = r.status;
    out.restBody = (await r.text()).slice(0, 300);
  } catch (e) {
    const err = e as { message?: string; cause?: { code?: string; message?: string } };
    out.fetchError = err?.message;
    out.fetchCause = err?.cause?.code ?? err?.cause?.message ?? String(err?.cause);
  }

  return Response.json(out);
}
