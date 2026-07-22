/**
 * See docs/07-user-roles.md. `nurse` is reserved (Phase 1 has no UI/permissions
 * for it) so adding it later is additive, not a breaking change to this union.
 */
export const ROLES = [
  "super_admin",
  "admin",
  "office",
  "reception",
  "doctor",
  "pharmacy",
  "lab",
  "patient",
  "nurse",
] as const;

export type Role = (typeof ROLES)[number];

export const PHASE_1_ACTIVE_ROLES: Role[] = ROLES.filter((r) => r !== "nurse");

/**
 * Scope model per role — docs/07-user-roles.md §7.1.
 * - "platform": no hospital/branch claim required.
 * - "hospital": requester's hospitalId claim must match the resource.
 * - "branch": requester's hospitalId AND branchId claims must match the resource.
 * - "ownership": resource.patientId must equal the requester's uid, no tenant match.
 */
export type ScopeModel = "platform" | "hospital" | "branch" | "ownership";

export const ROLE_SCOPE: Record<Role, ScopeModel> = {
  super_admin: "platform",
  admin: "hospital",
  office: "branch",
  reception: "branch",
  doctor: "branch",
  pharmacy: "branch",
  lab: "branch",
  nurse: "branch",
  patient: "ownership",
};
