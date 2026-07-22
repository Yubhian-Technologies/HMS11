import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetAvailabilityTemplateStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-4.1. admin (delegated) or doctor (own only). */
export const setAvailabilityTemplateStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "doctor"]);
  const { hospitalId, templateId, status } = SetAvailabilityTemplateStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("doctorAvailabilityTemplates").doc(templateId).get();
  const template = snap.data();
  if (!snap.exists || template?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Template not found.");
  }
  if (caller.role === "doctor" && caller.uid !== template?.doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only manage their own availability.");
  }

  await writeWithAudit(db, {
    collection: "doctorAvailabilityTemplates",
    docId: templateId,
    data: { status },
    action: "statusChange",
    before: template ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
