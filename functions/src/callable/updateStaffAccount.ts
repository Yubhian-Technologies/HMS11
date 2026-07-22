import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ManagedStaffRole, UpdateStaffAccountRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-3.1. admin only, own hospital. Edits users/{uid} fields shared by every
 * managed staff role (including doctor) — doctor's clinical fields are
 * edited separately via updateDoctorProfile.
 */
export const updateStaffAccount = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { uid, hospitalId, ...fields } = UpdateStaffAccountRequest.parse(request.data);

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

  if (fields.branchId) {
    const branchSnap = await db.collection(`hospitals/${hospitalId}/branches`).doc(fields.branchId).get();
    if (!branchSnap.exists) {
      throw new HttpsError("not-found", "Branch not found.");
    }
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: "users",
    docId: uid,
    data: updates,
    action: "update",
    before: target ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
