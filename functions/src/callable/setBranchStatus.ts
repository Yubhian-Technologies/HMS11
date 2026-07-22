import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetBranchStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-2.3. super_admin, or admin scoped to their own hospital. */
export const setBranchStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin", "admin"]);
  const { hospitalId, branchId, status } = SetBranchStatusRequest.parse(request.data);

  if (caller.role === "admin" && caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage branches of your own hospital.");
  }

  const db = getFirestore();
  const ref = db.collection(`hospitals/${hospitalId}/branches`).doc(branchId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }

  await writeWithAudit(db, {
    collection: `hospitals/${hospitalId}/branches`,
    docId: branchId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
