import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@hms/shared";
import { getAdminAuth } from "@/server/firebase-admin";
import { SESSION_COOKIE_NAME } from "./constants";
import { roleHome } from "./role-home";

export { roleHome };

export type Session = {
  uid: string;
  role: Role;
  hospitalId: string | null;
  branchId: string | null;
};

/**
 * Verifies the session cookie against the Admin SDK on every call
 * (checkRevoked: true) — this is what makes onUserStatusChange's
 * force-revoke on disable (docs/07-user-roles.md §7.3) actually take effect,
 * instead of a disabled user staying logged in until the cookie expires.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const claims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const role = claims.role as Role | undefined;
    if (!role) return null;

    return {
      uid: claims.uid,
      role,
      hospitalId: (claims.hospitalId as string | null | undefined) ?? null,
      branchId: (claims.branchId as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * The claims-aware gate called from every role folder's layout.tsx (docs/11
 * rule 3). Mismatched role → redirected to that user's own home, not a 403
 * page (docs/16-navigation-flow.md §16.1).
 */
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) redirect(roleHome(session.role));
  return session;
}
