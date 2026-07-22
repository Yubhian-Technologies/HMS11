import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * Cheap pre-check only: redirects fully-unauthenticated requests (no session
 * cookie at all) away from protected paths before any page work happens.
 * This does NOT verify the cookie's signature or read role claims — the
 * real, claims-aware gate is `requireRole()`, called from every role
 * folder's layout.tsx (see docs/11-folder-structure.md rule 3 and
 * lib/auth/require-role.ts). Kept as a separate, deliberately dumb layer so
 * a bug in claims/role logic can't accidentally leak past this fast path —
 * both checks must agree, not either one alone.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
