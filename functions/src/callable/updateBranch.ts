import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateBranchRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-2.3. super_admin, or admin scoped to their own hospital. */
export const updateBranch = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin", "admin"]);
  const { hospitalId, branchId, ...fields } = UpdateBranchRequest.parse(request.data);

  if (caller.role === "admin" && caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only edit branches of your own hospital.");
  }

  const db = getFirestore();
  const ref = db.collection(`hospitals/${hospitalId}/branches`).doc(branchId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: `hospitals/${hospitalId}/branches`,
    docId: branchId,
    data: updates,
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
