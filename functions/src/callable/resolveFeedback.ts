import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ResolveFeedbackRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-17.2. admin only, own hospital — moves a complaint through open -> acknowledged -> resolved. */
export const resolveFeedback = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, branchId, feedbackId, status } = ResolveFeedbackRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const feedbackCollection = branchCollection(hospitalId, branchId, "feedback");
  const snap = await db.collection(feedbackCollection).doc(feedbackId).get();
  const feedback = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Feedback not found.");
  }

  await writeWithAudit(db, {
    collection: feedbackCollection,
    docId: feedbackId,
    data: { status },
    action: "statusChange",
    before: feedback,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
