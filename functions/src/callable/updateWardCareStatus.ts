import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { UpdateWardCareStatusRequest, UpdateWardCareStatusResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Nurse only, own branch — ward-care progress notes during an admission
 * (docs/14-api-design.md §14.2). Deliberately restricted to the `careNotes`
 * field: bed assignment and discharge stay with Office/Doctor respectively
 * (docs/08-permission-matrix.md "Admissions" row), enforced here and mirrored
 * in firestore.rules' field-restricted update rule on `admissions`.
 */
export const updateWardCareStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["nurse"]);
  const input = UpdateWardCareStatusRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only update ward care in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db
    .collection(branchCollection(input.hospitalId, input.branchId, "admissions"))
    .doc(input.admissionId);
  const admissionSnap = await admissionRef.get();
  const admission = admissionSnap.data();
  if (!admissionSnap.exists) {
    throw new HttpsError("not-found", "Admission not found.");
  }
  if (admission?.status !== "admitted") {
    throw new HttpsError("failed-precondition", "This patient is not currently admitted.");
  }

  const now = FieldValue.serverTimestamp();
  await admissionRef.update({ careNotes: input.careNotes, nurseId: caller.uid, updatedAt: now });

  await db.collection("auditLogs").doc().set({
    hospitalId: input.hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "update",
    entityType: "admissions",
    entityId: input.admissionId,
    before: null,
    after: { careNotes: input.careNotes },
    createdAt: now,
  });

  return UpdateWardCareStatusResponse.parse({ success: true });
});
