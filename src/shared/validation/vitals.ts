import { z } from "zod";

/**
 * Nurse only, own branch (moved off Reception — docs/07-user-roles.md,
 * docs/08-permission-matrix.md "Vitals" row). BMI is computed server-side
 * from weight/height, never accepted from the client. Writes directly onto
 * `appointments/{id}.vitals` (embedded — docs/10-collections-schema.md §10.6),
 * not a standalone `vitals` document; "Send to Doctor" is this same call,
 * not a separate step — the doctor's live listener on the appointment
 * document sees the new vitals + status the instant this commits.
 */
export const RecordVitalsRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
    weightKg: z.number().positive(),
    heightCm: z.number().positive(),
    bloodPressure: z.string().min(1),
    pulse: z.number().int().positive(),
    temperatureC: z.number().positive(),
    spo2: z.number().min(0).max(100),
    sugarMgDl: z.number().nonnegative().nullish(),
    respiratoryRate: z.number().int().positive().nullish(),
    chiefComplaint: z.string().default(""),
    notes: z.string().default(""),
  })
  .strict();
export type RecordVitalsRequest = z.infer<typeof RecordVitalsRequest>;

export const RecordVitalsResponse = z.object({
  appointmentId: z.string(),
  status: z.literal("VITALS_COMPLETED"),
});
export type RecordVitalsResponse = z.infer<typeof RecordVitalsResponse>;
