import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetPatientStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * docs/07-user-roles.md §7.3 — patient accounts are never disabled by
 * hospital staff, only by the patient themself (closing their own account)
 * or Super Admin (platform abuse).
 */
export const setPatientStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient", "super_admin"]);
  const { patientId, status } = SetPatientStatusRequest.parse(request.data);

  const db = getFirestore();
  const snap = await db.collection("patients").doc(patientId).get();
  const patient = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }
  if (caller.role === "patient" && caller.uid !== patient?.userId) {
    throw new HttpsError("permission-denied", "You can only close your own account.");
  }

  await writeWithAudit(db, {
    collection: "patients",
    docId: patientId,
    data: { status },
    action: "statusChange",
    before: patient ?? null,
    context: {
      actorId: caller.uid,
      actorRole: caller.role,
      hospitalId: patient?.hospitalId ?? "platform",
    },
  });

  return { success: true };
});
