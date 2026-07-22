import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { AssignBedToAdmissionRequest } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * office only, own branch. A doctor's "pendingBedAssignment" admission
 * request only becomes "admitted" here — Office checks the bed is actually
 * available and links it, in the same transaction that marks the bed
 * occupied (docs/13-cloud-functions.md §13.4: the two must commit together).
 */
export const assignBedToAdmission = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, branchId, admissionId, bedId } = AssignBedToAdmissionRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);
  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only assign beds in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db.collection("admissions").doc(admissionId);
  const bedRef = db.collection("beds").doc(bedId);
  const [admissionSnap, bedSnap] = await Promise.all([admissionRef.get(), bedRef.get()]);
  const admission = admissionSnap.data();
  const bed = bedSnap.data();

  if (!admissionSnap.exists || admission?.hospitalId !== hospitalId || admission?.branchId !== branchId) {
    throw new HttpsError("not-found", "Admission request not found.");
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

  await db.runTransaction(async (tx) => {
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
