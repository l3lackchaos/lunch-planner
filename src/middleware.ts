import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight auth gate. Keeps the LIFF init flow non-blocking:
 * - `/api/*`, Next internals and static assets pass through untouched.
 * - `/` (splash) is always allowed — it hosts the LIFF bootstrap that performs
 *   login and sets the session cookie.
 * - Any other route requires the lp_session cookie; otherwise redirect to `/`.
 *
 * We only check cookie PRESENCE here (cheap, Edge-safe). Full signature/exp
 * verification happens server-side in getSession() on the actual data reads.
 */

const SESSION_COOKIE = "lp_session";

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Splash / LIFF bootstrap and the public UI-kit preview are open.
  if (pathname === "/" || pathname === "/preview") {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude API routes, Next internals, and static files from the matcher.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
