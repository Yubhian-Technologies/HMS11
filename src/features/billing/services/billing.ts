import {
  GenerateInvoiceRequest,
  GenerateInvoiceResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const generateInvoice = createCallable(
  "generateInvoice",
  GenerateInvoiceRequest,
  GenerateInvoiceResponse,
);

export const recordPayment = createCallable("recordPayment", RecordPaymentRequest, RecordPaymentResponse);
