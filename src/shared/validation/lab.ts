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
 * office only, own branch — collects the lab order's prepayment and flips it
 * from "pendingPayment" to "pending" (every lab order requires prepayment,
 * regardless of the fact that Admission/Prescription/Lab all originate only
 * from submitConsultation now). Office also selects the payment mode, which is
 * recorded on the order so the Lab's "payment done" state is fully audited.
 */
export const PaymentMethod = z.enum(["cash", "card", "upi"]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const MarkLabOrderPaidRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    labOrderId: z.string().min(1),
    paymentMethod: PaymentMethod,
  })
  .strict();
export type MarkLabOrderPaidRequest = z.infer<typeof MarkLabOrderPaidRequest>;
