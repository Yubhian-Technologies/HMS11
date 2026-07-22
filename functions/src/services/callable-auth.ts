import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { Role } from "@hms/shared";

export interface CallerContext {
  uid: string;
  role: Role;
  hospitalId: string | null;
  branchId: string | null;
}

/**
 * Every callable function's first line is this check (docs/13-cloud-functions.md
 * §13.4) — authorization is never inferred from client-supplied data, only
 * from the verified custom claims on the caller's ID token.
 */
export function requireCallerRole(request: CallableRequest, allowed: Role[]): CallerContext {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }

  const role = auth.token.role as Role | undefined;
  if (!role || !allowed.includes(role)) {
    throw new HttpsError("permission-denied", "You do not have permission to perform this action.");
  }

  return {
    uid: auth.uid,
    role,
    hospitalId: (auth.token.hospitalId as string | undefined) ?? null,
    branchId: (auth.token.branchId as string | undefined) ?? null,
  };
}
