import { z } from "zod";

/** FR-15.1. reception or admin, own branch. */
export const GenerateInvoiceRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
  })
  .strict();
export type GenerateInvoiceRequest = z.infer<typeof GenerateInvoiceRequest>;

export const GenerateInvoiceResponse = z.object({
  invoiceId: z.string(),
  totalAmount: z.number(),
});
export type GenerateInvoiceResponse = z.infer<typeof GenerateInvoiceResponse>;

/** FR-15.2 / FR-15.3. reception or admin, own hospital — cash/card/UPI recorded manually, no gateway. */
export const RecordPaymentRequest = z
  .object({
    hospitalId: z.string().min(1),
    invoiceId: z.string().min(1),
    amount: z.number().positive(),
    paymentMethod: z.enum(["cash", "card", "upi"]),
  })
  .strict();
export type RecordPaymentRequest = z.infer<typeof RecordPaymentRequest>;

export const RecordPaymentResponse = z.object({
  status: z.enum(["unpaid", "partial", "paid"]),
  paidAmount: z.number(),
});
export type RecordPaymentResponse = z.infer<typeof RecordPaymentResponse>;
