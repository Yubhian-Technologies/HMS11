import { z } from "zod";

export const LabOrderStatus = z.enum([
  "pending",
  "sampleCollected",
  "processing",
  "completed",
  "verified",
]);

/** FR-10.2. lab only, own branch. Sequential — enforced server-side, not just by this enum. */
export const AdvanceLabOrderStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    labOrderId: z.string().min(1),
    toStatus: LabOrderStatus,
  })
  .strict();
export type AdvanceLabOrderStatusRequest = z.infer<typeof AdvanceLabOrderStatusRequest>;

/**
 * FR-10.3. lab only, own branch. The client uploads the file to Storage
 * itself first (Storage Security Rules gate that write independently, per
 * docs/12-security-rules.md §12.5); this call persists the Firestore
 * record and flips the order to "reportUploaded".
 */
export const UploadLabReportRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    labOrderId: z.string().min(1),
    fileUrl: z.string().min(1),
    summaryNotes: z.string().nullish(),
  })
  .strict();
export type UploadLabReportRequest = z.infer<typeof UploadLabReportRequest>;

export const UploadLabReportResponse = z.object({ labReportId: z.string() });
export type UploadLabReportResponse = z.infer<typeof UploadLabReportResponse>;

/**
 * doctor only, own branch — assigns a lab test to a patient outside the
 * consult flow. Starts at "pendingPayment", not "pending" — Office must
 * mark it paid (markLabOrderPaid) before it enters the Module 10 pipeline.
 */
export const AssignLabOrderRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    appointmentId: z.string().min(1),
    testId: z.string().min(1),
  })
  .strict();
export type AssignLabOrderRequest = z.infer<typeof AssignLabOrderRequest>;

export const AssignLabOrderResponse = z.object({ labOrderId: z.string() });
export type AssignLabOrderResponse = z.infer<typeof AssignLabOrderResponse>;

/** office only, own branch — flips a standalone lab order from "pendingPayment" to "pending". */
export const MarkLabOrderPaidRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    labOrderId: z.string().min(1),
  })
  .strict();
export type MarkLabOrderPaidRequest = z.infer<typeof MarkLabOrderPaidRequest>;
