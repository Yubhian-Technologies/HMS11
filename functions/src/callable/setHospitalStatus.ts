import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetHospitalStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-2.1 / FR-2.6: disabling a hospital blocks login for all its staff and
 * hides it from patient visibility, without deleting any records (no hard
 * delete — NFR-7.1). Login blocking itself happens naturally: staff/admin
 * custom claims still carry the (now-disabled) hospitalId, but every
 * protected read in the app is additionally gated by the hospital's own
 * `status` field wherever hospital-scoped data is displayed — modules that
 * read hospital-scoped data check `status === "active"` themselves rather
 * than duplicating that check here.
 */
export const setHospitalStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin"]);
  const { hospitalId, status } = SetHospitalStatusRequest.parse(request.data);

  const db = getFirestore();
  const ref = db.collection("hospitals").doc(hospitalId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Hospital not found.");
  }

  await writeWithAudit(db, {
    collection: "hospitals",
    docId: hospitalId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
