import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AssignMedicineOrderRequest, AssignMedicineOrderResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * doctor only, own branch — the standalone medicine + duration assignment
 * module (separate from the consult-flow prescription in submitConsultation).
 */
export const assignMedicineOrder = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = AssignMedicineOrderRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only assign medicine in your own branch.");
  }

  const db = getFirestore();
  const patientSnap = await db.collection("patients").doc(input.patientId).get();
  if (!patientSnap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }

  const orderId = await writeWithAudit(db, {
    collection: "doctorMedicineOrders",
    data: {
      patientId: input.patientId,
      doctorId: caller.uid,
      items: input.items,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return AssignMedicineOrderResponse.parse({ orderId });
});
