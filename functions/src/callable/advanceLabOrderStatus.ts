import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AdvanceLabOrderStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

const SEQUENCE = ["pending", "sampleCollected", "processing", "completed", "verified"] as const;

/**
 * FR-10.2. lab only, own branch. Strictly sequential — `toStatus` must be
 * exactly the next stage after the order's current one, no skipping.
 * "reportUploaded" is reached only via uploadLabReport, not here.
 */
export const advanceLabOrderStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["lab"]);
  const { hospitalId, labOrderId, toStatus } = AdvanceLabOrderStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("labOrders").doc(labOrderId).get();
  const order = snap.data();
  if (!snap.exists || order?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Lab order not found.");
  }
  if (caller.branchId !== order?.branchId) {
    throw new HttpsError("permission-denied", "You can only manage lab orders in your own branch.");
  }

  const currentIndex = SEQUENCE.indexOf(order?.status);
  const targetIndex = SEQUENCE.indexOf(toStatus);
  if (currentIndex === -1 || targetIndex !== currentIndex + 1) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot move from "${order?.status}" to "${toStatus}" — stages must advance one at a time.`,
    );
  }

  await writeWithAudit(db, {
    collection: "labOrders",
    docId: labOrderId,
    data: { status: toStatus },
    action: "statusChange",
    before: order,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
