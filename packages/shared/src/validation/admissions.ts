import { z } from "zod";

/**
 * FR-12.3. doctor only, own admission. A bed cannot return to "available"
 * without this — the discharge summary is required, not optional.
 */
export const DischargePatientRequest = z
  .object({
    hospitalId: z.string().min(1),
    admissionId: z.string().min(1),
    diagnosis: z.string().min(1),
    treatmentGiven: z.string().min(1),
    conditionAtDischarge: z.string().min(1),
    followUpInstructions: z.string().default(""),
  })
  .strict();
export type DischargePatientRequest = z.infer<typeof DischargePatientRequest>;

export const DischargePatientResponse = z.object({ success: z.boolean() });
export type DischargePatientResponse = z.infer<typeof DischargePatientResponse>;

/**
 * office only, own branch. Checks the bed is actually available and links
 * it to the admission — this is what advances "pendingBedAssignment" to
 * "admitted" (see the Admission type doc comment).
 */
export const AssignBedToAdmissionRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    admissionId: z.string().min(1),
    bedId: z.string().min(1),
  })
  .strict();
export type AssignBedToAdmissionRequest = z.infer<typeof AssignBedToAdmissionRequest>;
