import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { MarkLabOrderPaidRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** office only, own branch — flips a lab order from "pendingPayment" to "pending" (every lab order requires prepayment). */
export const markLabOrderPaid = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const input = MarkLabOrderPaidRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);
  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only mark lab orders paid in your own branch.");
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
    data: { status: "pending" },
    action: "statusChange",
    before: order,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return { success: true };
});
