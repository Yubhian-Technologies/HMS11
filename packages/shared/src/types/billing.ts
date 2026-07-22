import type { BaseDoc } from "./base";

export interface InvoiceLineItem {
  type: "consultation" | "lab" | "pharmacy" | "room";
  description: string;
  amount: number;
}

/**
 * invoices/{id}. Generated on demand at checkout (FR-15.1), not
 * incrementally as each clinical step happens — Reception/Admin trigger
 * generation once the visit's billable steps are done, and it aggregates
 * whatever consultation/lab/pharmacy records exist for that appointment at
 * that moment. Room charges are a supported line item type but not
 * auto-computed (no per-day bed rate exists in the data model yet) — a
 * documented gap, not a silent omission.
 */
export interface Invoice extends BaseDoc {
  appointmentId: string;
  admissionId: string | null;
  patientId: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: "cash" | "card" | "upi" | null;
  status: "unpaid" | "partial" | "paid";
}
