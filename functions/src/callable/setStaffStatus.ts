import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ManagedStaffRole, SetStaffStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-3.1. admin only, own hospital. Scoped to office/reception/doctor/
 * pharmacy/lab only — an Admin can never disable another Admin, a
 * Super Admin, or a patient through this action.
 */
export const setStaffStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { uid, hospitalId, status } = SetStaffStatusRequest.parse(request.data);

  if (caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage staff in your own hospital.");
  }

  const db = getFirestore();
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const target = snap.data();
  if (!snap.exists || target?.hospitalId !== hospitalId || !ManagedStaffRole.safeParse(target?.role).success) {
    throw new HttpsError("not-found", "Staff account not found in this hospital.");
  }

  await writeWithAudit(db, {
    collection: "users",
    docId: uid,
    data: { status },
    action: "statusChange",
    before: target ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
