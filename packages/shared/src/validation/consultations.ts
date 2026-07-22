import { z } from "zod";

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
    admission: z.object({ bedId: z.string().min(1) }).strict().nullish(),
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
  consultationId: z.string(),
  prescriptionId: z.string().nullable(),
  labOrderIds: z.array(z.string()),
  admissionId: z.string().nullable(),
  followUpId: z.string().nullable(),
  certificateId: z.string().nullable(),
  referralId: z.string().nullable(),
});
export type SubmitConsultationResponse = z.infer<typeof SubmitConsultationResponse>;
