import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { RecordPaymentRequest, RecordPaymentResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-15.2 / FR-15.3. reception or admin, own hospital — manual entry, no payment gateway. */
export const recordPayment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception", "admin"]);
  const input = RecordPaymentRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  const invoiceRef = db.collection("invoices").doc(input.invoiceId);
  const invoiceSnap = await invoiceRef.get();
  const invoice = invoiceSnap.data();
  if (!invoiceSnap.exists || invoice?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Invoice not found.");
  }
  if (caller.role === "reception" && caller.branchId !== invoice?.branchId) {
    throw new HttpsError("permission-denied", "You can only record payments in your own branch.");
  }

  const newPaidAmount = (invoice?.paidAmount ?? 0) + input.amount;
  if (newPaidAmount > (invoice?.totalAmount ?? 0)) {
    throw new HttpsError("invalid-argument", "Payment exceeds the outstanding balance.");
  }
  const status = newPaidAmount >= (invoice?.totalAmount ?? 0) ? "paid" : "partial";

  await writeWithAudit(db, {
    collection: "invoices",
    docId: input.invoiceId,
    data: { paidAmount: newPaidAmount, paymentMethod: input.paymentMethod, status },
    action: "update",
    before: invoice,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return RecordPaymentResponse.parse({ status, paidAmount: newPaidAmount });
});
