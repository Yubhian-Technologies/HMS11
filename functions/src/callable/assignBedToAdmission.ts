import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { AssignBedToAdmissionRequest, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * office only, own branch — Office checks bed availability and allots the
 * bed (Phase D Branch 1: bed allocation is Office's job, not the doctor's;
 * the doctor only flags that a room is needed via submitConsultation's
 * `admissionRequested`). A doctor's "pendingBedAssignment" admission
 * request only becomes "admitted" here — the caller checks the bed is
 * actually available and links it, in the same transaction that marks the
 * bed occupied (docs/13-cloud-functions.md §13.4: the two must commit
 * together).
 */
export const assignBedToAdmission = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, branchId, admissionId, bedId } = AssignBedToAdmissionRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);
  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only assign beds in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db.collection(branchCollection(hospitalId, branchId, "admissions")).doc(admissionId);
  const bedRef = db.collection(branchCollection(hospitalId, branchId, "beds")).doc(bedId);

  await db.runTransaction(async (tx) => {
    // Both docs must be read *inside* the transaction (not via the plain
    // .get() this used to do before the transaction started) so Firestore
    // can detect and retry a conflicting concurrent assignment — otherwise
    // two simultaneous assignAdmission calls for the same bed both pass the
    // stale "available" check and both commit, double-booking the bed.
    const [admissionSnap, bedSnap] = await Promise.all([tx.get(admissionRef), tx.get(bedRef)]);
    const admission = admissionSnap.data();
    const bed = bedSnap.data();

    if (!admissionSnap.exists) {
      throw new HttpsError("not-found", "Admission request not found.");
    }
    if (admission?.status !== "pendingBedAssignment") {
      throw new HttpsError("failed-precondition", "This admission is not awaiting a bed assignment.");
    }
    if (!bedSnap.exists) {
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
