import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateHospitalRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-2.1. super_admin only — Admin has read-only access to the hospital's
 * own top-level record (docs/08-permission-matrix.md "Hospitals" row).
 */
export const updateHospital = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin"]);
  const { hospitalId, ...fields } = UpdateHospitalRequest.parse(request.data);

  const db = getFirestore();
  const ref = db.collection("hospitals").doc(hospitalId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Hospital not found.");
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: "hospitals",
    docId: hospitalId,
    data: updates,
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
