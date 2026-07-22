import type { BaseDoc } from "./base";

/** vitals/{id} — recorded by Reception at check-in (FR-8.2), read live by the doctor (FR-8.3). */
export interface Vitals extends BaseDoc {
  appointmentId: string;
  patientId: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bloodPressure: string;
  pulse: number;
  sugarMgDl: number;
  temperatureC: number;
  spo2: number;
  chiefComplaint: string;
  notes: string;
}
