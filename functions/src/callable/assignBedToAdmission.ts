import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { AssignBedToAdmissionRequest } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * office OR doctor, own branch — FR-9.5/FR-12.2 both say the Doctor can
 * assign a bed at admission time, while docs/13-cloud-functions.md's
 * function table separately gives Office a bed-availability/room-assignment
 * queue; both are legitimate entry points to the same action, so both
 * roles are allowed here. A doctor may only assign a bed to their own
 * patient's admission request; Office (running the room-assignment queue
 * for the whole branch) isn't limited to any one doctor. A doctor's
 * "pendingBedAssignment" admission request only becomes "admitted" here —
 * the caller checks the bed is actually available and links it, in the same
 * transaction that marks the bed occupied (docs/13-cloud-functions.md
 * §13.4: the two must commit together).
 */
export const assignBedToAdmission = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office", "doctor"]);
  const { hospitalId, branchId, admissionId, bedId } = AssignBedToAdmissionRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);
  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only assign beds in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db.collection("admissions").doc(admissionId);
  const bedRef = db.collection("beds").doc(bedId);

  await db.runTransaction(async (tx) => {
    // Both docs must be read *inside* the transaction (not via the plain
    // .get() this used to do before the transaction started) so Firestore
    // can detect and retry a conflicting concurrent assignment — otherwise
    // two simultaneous assignAdmission calls for the same bed both pass the
    // stale "available" check and both commit, double-booking the bed.
    const [admissionSnap, bedSnap] = await Promise.all([tx.get(admissionRef), tx.get(bedRef)]);
    const admission = admissionSnap.data();
    const bed = bedSnap.data();

    if (!admissionSnap.exists || admission?.hospitalId !== hospitalId || admission?.branchId !== branchId) {
      throw new HttpsError("not-found", "Admission request not found.");
    }
    if (caller.role === "doctor" && admission?.doctorId !== caller.uid) {
      throw new HttpsError("permission-denied", "You can only assign a bed to your own patients.");
    }
    if (admission?.status !== "pendingBedAssignment") {
      throw new HttpsError("failed-precondition", "This admission is not awaiting a bed assignment.");
    }
    if (!bedSnap.exists || bed?.hospitalId !== hospitalId || bed?.branchId !== branchId) {
      throw new HttpsError("not-found", "Bed not found.");
    }
    if (bed?.status !== "available") {
      throw new HttpsError("failed-precondition", "This bed is not available.");
    }

    const now = FieldValue.serverTimestamp();

    tx.update(admissionRef, { bedId, status: "admitted", admittedAt: now, updatedAt: now });
    tx.update(bedRef, { status: "occupied", updatedAt: now });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "statusChange",
      entityType: "admissions",
      entityId: admissionId,
      before: { status: "pendingBedAssignment", bedId: null },
      after: { status: "admitted", bedId },
      createdAt: now,
    });
  });

  return { success: true };
});
