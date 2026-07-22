import type { Role } from "./roles";
import { ROLE_SCOPE } from "./roles";

/**
 * TypeScript mirror of the Firestore Security Rules scope helpers in
 * docs/12-security-rules.md §12.2. Used for server-side (Cloud Functions /
 * Next.js server actions) authorization checks — Security Rules remain the
 * final, non-bypassable enforcement layer for direct client writes; this is
 * the same logic applied before a callable function performs a privileged
 * write via the Admin SDK (which bypasses rules).
 */
export interface AuthClaims {
  uid: string;
  role: Role;
  hospitalId: string | null;
  branchId: string | null;
}

export interface ScopedResource {
  hospitalId: string;
  branchId: string | null;
  patientId?: string;
}

export function isInScope(claims: AuthClaims, resource: ScopedResource): boolean {
  switch (ROLE_SCOPE[claims.role]) {
    case "platform":
      return true;
    case "hospital":
      return claims.hospitalId !== null && claims.hospitalId === resource.hospitalId;
    case "branch":
      return (
        claims.hospitalId !== null &&
        claims.branchId !== null &&
        claims.hospitalId === resource.hospitalId &&
        claims.branchId === resource.branchId
      );
    case "ownership":
      return resource.patientId !== undefined && resource.patientId === claims.uid;
  }
}
