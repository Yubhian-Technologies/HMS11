import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateDoctorProfileRequest, branchCollection, doctorPath, hospitalCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-3.2 + FR-3.3. admin only, own hospital. */
export const updateDoctorProfile = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { uid, hospitalId, ...fields } = UpdateDoctorProfileRequest.parse(request.data);

  if (caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage staff in your own hospital.");
  }

  const db = getFirestore();
  // The doctor extension doc is nested under its own branch, but this
  // request only carries hospitalId/uid — look up the branch from the
  // (flat, unchanged) users/{uid} doc, same as createDoctorAccount wrote it.
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  if (!userSnap.exists || user?.hospitalId !== hospitalId || user?.role !== "doctor") {
    throw new HttpsError("not-found", "Doctor profile not found in this hospital.");
  }
  const branchId = user.branchId as string;

  const ref = db.doc(doctorPath(hospitalId, branchId, uid));
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Doctor profile not found in this hospital.");
  }

  if (fields.departmentId) {
    const deptSnap = await db.collection(hospitalCollection(hospitalId, "departments")).doc(fields.departmentId).get();
    if (!deptSnap.exists) {
      throw new HttpsError("not-found", "Department not found in this hospital.");
    }
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "doctors"),
    docId: uid,
    data: updates,
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
