import { z } from "zod";

/** FR-8.1. reception only, own branch. */
export const CheckInPatientRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
  })
  .strict();
export type CheckInPatientRequest = z.infer<typeof CheckInPatientRequest>;

export const CheckInPatientResponse = z.object({ token: z.string() });
export type CheckInPatientResponse = z.infer<typeof CheckInPatientResponse>;

/** FR-8.2. reception only, own branch — BMI is computed server-side, never trusted from the client. */
export const RecordVitalsRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
    weightKg: z.number().positive(),
    heightCm: z.number().positive(),
    bloodPressure: z.string().min(1),
    pulse: z.number().int().positive(),
    sugarMgDl: z.number().nonnegative(),
    temperatureC: z.number().positive(),
    spo2: z.number().min(0).max(100),
    chiefComplaint: z.string().default(""),
    notes: z.string().default(""),
  })
  .strict();
export type RecordVitalsRequest = z.infer<typeof RecordVitalsRequest>;

export const RecordVitalsResponse = z.object({ vitalsId: z.string() });
export type RecordVitalsResponse = z.infer<typeof RecordVitalsResponse>;
