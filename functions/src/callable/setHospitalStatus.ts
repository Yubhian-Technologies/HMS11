import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetHospitalStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-2.1 / FR-2.6: disabling a hospital blocks login for all its staff and
 * hides it from patient visibility, without deleting any records (no hard
 * delete — NFR-7.1). Login blocking is handled by
 * functions/src/triggers/onHospitalStatusChange.ts, which fires on this
 * write and revokes every staff member's refresh tokens (mirrors
 * onUserStatusChange's per-user FR-1.4 mechanism) — apps/web's requireRole()
 * (verifySessionCookie with checkRevoked=true) then rejects on their very
 * next request. Patient visibility is handled at the read layer wherever
 * hospital-scoped data is patient-facing (e.g. patient/book/page.tsx filters
 * `status === "active"`), since patients aren't hospital-scoped by claim.
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
