import type { BaseDoc, Address, Weekday } from "./base";

/**
 * hospitals/{hospitalId}. See docs/10-collections-schema.md "Tenancy".
 */
export interface Hospital extends BaseDoc {
  name: string;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone: string;
  address: Address;
  adminUserId: string | null;
  status: "active" | "disabled";
}

export interface BranchTiming {
  day: Weekday;
  open: string;
  close: string;
}

/**
 * hospitals/{hospitalId}/branches/{branchId} — the one deliberate exception
 * to flat top-level collections (docs/09-firestore-design.md §9.3): a branch
 * has no existence outside its hospital and is never queried cross-hospital.
 * Still carries `hospitalId` (matching its parent) and `branchId: null` (a
 * branch is not itself scoped to a branch) for consistency with the shared
 * rules scope helpers.
 */
export interface Branch extends BaseDoc {
  name: string;
  address: Address;
  contactPhone: string;
  timings: BranchTiming[];
  status: "active" | "disabled";
}
