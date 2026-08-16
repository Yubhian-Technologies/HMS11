import { z } from "zod";

/** doctor only, own appointment. VITALS_COMPLETED -> CONSULTING, when the doctor opens the chart. */
export const StartConsultationRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
  })
  .strict();
export type StartConsultationRequest = z.infer<typeof StartConsultationRequest>;

export const StartConsultationResponse = z.object({ success: z.boolean() });
export type StartConsultationResponse = z.infer<typeof StartConsultationResponse>;

export const PrescriptionItemSchema = z
  .object({
    medicineName: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    durationDays: z.number().int().positive(),
    instructions: z.string().default(""),
  })
  .strict();

/**
 * doctor only, own appointment. Autosaves in-progress consult form state so
 * a refresh/crash mid-consultation doesn't lose it. Every field optional —
 * this is a draft snapshot, not a validated submission (that's
 * SubmitConsultationRequest). Written directly by the client (Security
 * Rules restrict the doctor's write to exactly `consultDraft`/`updatedAt`),
 * not through a callable — this needs to be cheap and frequent (debounced
 * autosave), not audited like a real state transition.
 */
export const SaveConsultDraftSchema = z
  .object({
    diagnosis: z.string().optional(),
    clinicalNotes: z.string().optional(),
    prescription: z.array(PrescriptionItemSchema).optional(),
    labTestIds: z.array(z.string()).optional(),
    admissionRequested: z.boolean().optional(),
  })
  .strict();
export type SaveConsultDraft = z.infer<typeof SaveConsultDraftSchema>;

/**
 * FR-9.2–9.8. doctor only, own appointment. One transactional action covers
 * every doctor decision made from the consultation screen — diagnosis is
 * always required; everything else is opt-in per visit
 * (docs/17-module-breakdown.md: follow-ups/certificates/referrals belong to
 * this module, not separate ones).
 */
export const SubmitConsultationRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
    diagnosis: z.string().min(1),
    clinicalNotes: z.string().default(""),
    prescription: z.array(PrescriptionItemSchema).nullish(),
    labTestIds: z.array(z.string().min(1)).nullish(),
    // Office assigns the actual bed afterwards (assignBedToAdmission) — the
    // doctor only flags that a room is needed, no bed picker at this step.
    admissionRequested: z.boolean().optional(),
    followUp: z.object({ scheduledDate: z.string().min(1) }).strict().nullish(),
    certificate: z
      .object({
        reason: z.string().min(1),
        restFromDate: z.string().min(1),
        restToDate: z.string().min(1),
      })
      .strict()
      .nullish(),
    referral: z
      .object({
        toDepartmentId: z.string().min(1),
        toDoctorId: z.string().min(1).nullish(),
        reason: z.string().min(1),
      })
      .strict()
      .nullish(),
  })
  .strict();
export type SubmitConsultationRequest = z.infer<typeof SubmitConsultationRequest>;

export const SubmitConsultationResponse = z.object({
  appointmentId: z.string(),
  prescriptionId: z.string().nullable(),
  labOrderIds: z.array(z.string()),
  admissionId: z.string().nullable(),
  followUpId: z.string().nullable(),
  certificateId: z.string().nullable(),
  referralId: z.string().nullable(),
});
export type SubmitConsultationResponse = z.infer<typeof SubmitConsultationResponse>;
