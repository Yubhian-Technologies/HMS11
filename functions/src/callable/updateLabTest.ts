import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateLabTestRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.6. admin only, own hospital. */
export const updateLabTest = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, branchId, testId, ...fields } = UpdateLabTestRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection(branchCollection(hospitalId, branchId, "labTestMaster")).doc(testId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Lab test not found.");
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "labTestMaster"),
    docId: testId,
    data: updates,
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
