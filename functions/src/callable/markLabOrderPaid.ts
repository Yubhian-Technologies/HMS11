import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { MarkLabOrderPaidRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireOperation } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

/**
 * Office only, own branch — collects a lab order's prepayment and selects
 * the mode of payment (cash/card/upi). Flips the order from
 * "pendingPayment" to "pending" (every lab order requires prepayment,
 * regardless of origin). The payment record (method + who collected it +
 * when) is written onto the order itself, so the Lab's "payment done" state
 * is audited end to end, and the patient is notified that payment is
 * received and processing has started.
 */
export const markLabOrderPaid = onCall(async (request) => {
  const caller = requireOperation(request, "labOrder.collectPayment");
  const input = MarkLabOrderPaidRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);
  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only collect lab order payments in your own branch.");
  }

  const db = getFirestore();
  const snap = await db
    .collection(branchCollection(input.hospitalId, input.branchId, "labOrders"))
    .doc(input.labOrderId)
    .get();
  const order = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Lab order not found.");
  }
  if (order?.status !== "pendingPayment") {
    throw new HttpsError("failed-precondition", "This lab order is not awaiting payment.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "labOrders"),
    docId: input.labOrderId,
    data: {
      status: "pending",
      payment: {
        method: input.paymentMethod,
        collectedBy: caller.uid,
        collectedAt: FieldValue.serverTimestamp(),
      },
    },
    action: "statusChange",
    before: order,
    entityType: "labOrders",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  if (order?.patientId) {
    await sendNotification({
      userId: order.patientId as string,
      type: "labOrderPaymentReceived",
      title: "Lab payment received",
      body: `Payment received for ${order.testName as string} — processing has started.`,
      hospitalId: input.hospitalId,
      relatedEntityId: input.labOrderId,
    });
  }

  return { success: true };
});
