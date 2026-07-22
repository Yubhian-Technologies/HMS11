import type { BaseDoc } from "./base";

/**
 * healthUpdates/{id}. Patient self-reported, not tied to a specific
 * hospital encounter — hospitalId is nullable like User/PatientProfile
 * (docs/07-user-roles.md §7.1 ownership scope), narrower than BaseDoc for
 * the same reason as those two types.
 */
export interface HealthUpdate extends Omit<BaseDoc, "hospitalId"> {
  hospitalId: string | null;
  patientId: string;
  condition: "better" | "same" | "worse";
  painLevel: number;
  sugarMgDl?: number;
  bloodPressure?: string;
  temperatureC?: number;
  weightKg?: number;
}
