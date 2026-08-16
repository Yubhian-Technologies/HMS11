import type { BaseDoc, Address } from "./base";

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  documentUrl?: string;
}

/**
 * patients/{id} — doc id = uid when self-registered (FR-1.2/FR-5.1), or a
 * generated id for a Reception-created walk-in not yet linked to an auth
 * account (`userId: null` — docs/10-collections-schema.md).
 *
 * hospitalId/branchId are null for a self-registered patient (their data
 * follows the patient across hospitals — docs/07-user-roles.md §7.1
 * ownership scope) and populated only for a walk-in record created by
 * Reception before any linking exists. Narrower than BaseDoc for the same
 * reason as User (types/identity.ts).
 */
export interface PatientProfile extends Omit<BaseDoc, "hospitalId"> {
  hospitalId: string | null;
  userId: string | null;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  dob: string; // ISO date
  phone: string;
  email?: string;
  address: Address;
  bloodGroup: string;
  emergencyContact: EmergencyContact;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  insurance?: Insurance;
  status: "active" | "disabled";
}
