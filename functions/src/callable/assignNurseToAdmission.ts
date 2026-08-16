import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AssignNurseToAdmissionRequest, AssignNurseToAdmissionResponse, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Office only, own branch — Phase D Branch 1 step 3 ("Office assigns
 * Nurse"). Explicit Office choice, not a nurse self-assigning by being the
 * first to touch updateWardCareStatus (which now requires the caller to
 * already be the assigned nurse). Only valid for an already-`admitted`
 * patient — bed assignment (assignBedToAdmission) must happen first.
 */
export const assignNurseToAdmission = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, branchId, admissionId, nurseId } = AssignNurseToAdmissionRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);
  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only assign nurses in your own branch.");
  }

  const db = getFirestore();
  const admissionRef = db.collection(branchCollection(hospitalId, branchId, "admissions")).doc(admissionId);
  const [admissionSnap, nurseSnap] = await Promise.all([
    admissionRef.get(),
    db.collection("users").doc(nurseId).get(),
  ]);
  const admission = admissionSnap.data();
  if (!admissionSnap.exists) {
    throw new HttpsError("not-found", "Admission not found.");
  }
  if (admission?.status !== "admitted") {
    throw new HttpsError("failed-precondition", "A bed must be assigned before a nurse can be assigned.");
  }
  const nurse = nurseSnap.data();
  if (!nurseSnap.exists || nurse?.role !== "nurse" || nurse?.hospitalId !== hospitalId || nurse?.branchId !== branchId) {
    throw new HttpsError("invalid-argument", "That user is not a nurse in this branch.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "admissions"),
    docId: admissionId,
    data: { nurseId },
    action: "update",
    before: { nurseId: admission?.nurseId ?? null },
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return AssignNurseToAdmissionResponse.parse({ success: true });
});
