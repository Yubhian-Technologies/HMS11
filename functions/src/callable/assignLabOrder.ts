import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AssignLabOrderRequest, AssignLabOrderResponse, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * doctor only, own branch — assigns a lab test to a patient outside the
 * consult flow (Doctor Labs module). Starts at "pendingPayment" — Office
 * must call markLabOrderPaid before it enters the Module 10 lab pipeline.
 */
export const assignLabOrder = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = AssignLabOrderRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only assign lab orders in your own branch.");
  }

  const db = getFirestore();
  const [patientSnap, testSnap] = await Promise.all([
    db.collection("patients").doc(input.patientId).get(),
    db.collection(branchCollection(input.hospitalId, input.branchId, "labTestMaster")).doc(input.testId).get(),
  ]);
  if (!patientSnap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }
  if (!testSnap.exists) {
    throw new HttpsError("not-found", "Lab test not found.");
  }

  const labOrderId = await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "labOrders"),
    data: {
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      doctorId: caller.uid,
      testId: input.testId,
      testName: testSnap.data()?.name as string,
      status: "pendingPayment",
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return AssignLabOrderResponse.parse({ labOrderId });
});
