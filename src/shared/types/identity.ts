import type { BaseDoc } from "./base";
import type { Role } from "../rbac/roles";

/**
 * users/{uid} — covers every role including patient. Doc id = Firebase Auth uid.
 * See docs/10-collections-schema.md "Identity".
 *
 * hospitalId/branchId are null for super_admin and patient — see
 * docs/07-user-roles.md §7.1.
 */
export interface User extends Omit<BaseDoc, "hospitalId"> {
  // Narrower than BaseDoc: null for super_admin and patient (see the
  // doc comment above) — every other collection's hospitalId is always
  // populated, so this override stays local to User rather than loosening
  // BaseDoc itself.
  hospitalId: string | null;
  role: Role;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  fcmTokens: string[];
  status: "active" | "disabled";
}

/**
 * doctorProfiles/{uid} — 1:1 with users/{uid} (same document id), holding
 * clinical fields that don't belong on the generic User shape. See
 * docs/10-collections-schema.md "Identity".
 */
export interface DoctorProfile extends BaseDoc {
  departmentId: string;
  specialization: string;
  qualifications: string[];
  consultationFee: number;
  status: "active" | "disabled";
}
