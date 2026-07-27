import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { DischargePatientRequest, DischargePatientResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-12.3. doctor only, own admission. A bed cannot return to "available"
 * without a completed discharge summary — enforced here, not just by
 * convention: the bed update and the summary write commit together.
 */
export const dischargePatient = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = DischargePatientRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);
  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only discharge patients in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db
    .collection(branchCollection(input.hospitalId, input.branchId, "admissions"))
    .doc(input.admissionId);

  await db.runTransaction(async (tx) => {
    // Read inside the transaction so a concurrent discharge/reassignment of
    // the same admission is detected and retried rather than both callers
    // committing against a stale "admitted" status.
    const admissionSnap = await tx.get(admissionRef);
    const admission = admissionSnap.data();
    if (!admissionSnap.exists) {
      throw new HttpsError("not-found", "Admission not found.");
    }
    if (admission?.doctorId !== caller.uid) {
      throw new HttpsError("permission-denied", "You can only discharge your own patients.");
    }
    if (admission?.status !== "admitted") {
      throw new HttpsError("failed-precondition", "This patient is already discharged.");
    }

    const now = FieldValue.serverTimestamp();

    tx.update(admissionRef, {
      status: "discharged",
      dischargedAt: now,
      dischargeSummary: {
        diagnosis: input.diagnosis,
        treatmentGiven: input.treatmentGiven,
        conditionAtDischarge: input.conditionAtDischarge,
        followUpInstructions: input.followUpInstructions,
        authoredBy: caller.uid,
        authoredAt: now,
      },
      updatedAt: now,
    });

    tx.update(
      db.collection(branchCollection(input.hospitalId, input.branchId, "beds")).doc(admission.bedId),
      { status: "available", updatedAt: now },
    );

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "statusChange",
      entityType: "admissions",
      entityId: input.admissionId,
      before: { status: "admitted" },
      after: { status: "discharged" },
      createdAt: now,
    });
  });

  return DischargePatientResponse.parse({ success: true });
});
