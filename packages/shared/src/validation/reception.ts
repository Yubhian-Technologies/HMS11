import { z } from "zod";

/**
 * FR-8.1. reception only, own branch. Sets the embedded `checkIn` field on
 * the appointment (docs/10-collections-schema.md §10.6) — vitals capture
 * moved to Nurse, see validation/vitals.ts.
 */
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
