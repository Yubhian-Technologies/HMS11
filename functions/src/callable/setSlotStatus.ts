import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetSlotStatusRequest, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-4.4 / FR-4.5. "approved"/"rejected" is the doctor approving their own
 * generated slots (docs/08-permission-matrix.md "Doctor slots" row —
 * approval is never Office's). "blocked" is Office pulling a slot out of
 * circulation regardless of its current status.
 */
export const setSlotStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor", "office"]);
  const { hospitalId, branchId, doctorId, slotId, status } = SetSlotStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.role === "doctor" && caller.uid !== doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only act on their own slots.");
  }
  if (caller.role === "office" && caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only manage slots in your own branch.");
  }

  const db = getFirestore();
  const slotsCollection = doctorCollection(hospitalId, branchId, doctorId, "slots");
  const snap = await db.collection(slotsCollection).doc(slotId).get();
  const slot = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Slot not found.");
  }

  if (caller.role === "doctor") {
    if (status === "blocked") {
      throw new HttpsError("permission-denied", "Doctors approve or reject; only Office blocks a slot.");
    }
    if (slot?.status !== "pendingApproval") {
      throw new HttpsError("failed-precondition", "Only pending slots can be approved or rejected.");
    }
  }

  if (caller.role === "office") {
    // Office may block any approved slot, or unblock one it previously
    // blocked (back to "approved" — a blocked slot was necessarily approved
    // beforehand, since only approved/manually-created slots can be
    // blocked in the first place).
    const validTransition =
      (status === "blocked" && slot?.status === "approved") || (status === "approved" && slot?.status === "blocked");
    if (!validTransition) {
      throw new HttpsError("permission-denied", "Office may only block an active slot or unblock one it blocked.");
    }
  }

  await writeWithAudit(db, {
    collection: slotsCollection,
    docId: slotId,
    data: { status },
    action: "statusChange",
    before: slot ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
