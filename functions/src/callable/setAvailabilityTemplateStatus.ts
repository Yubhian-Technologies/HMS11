import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetAvailabilityTemplateStatusRequest, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-4.1. admin (delegated) or doctor (own only). */
export const setAvailabilityTemplateStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "doctor"]);
  const { hospitalId, branchId, doctorId, templateId, status } = SetAvailabilityTemplateStatusRequest.parse(
    request.data,
  );
  assertOwnHospital(caller, hospitalId);
  if (caller.role === "doctor" && caller.uid !== doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only manage their own availability.");
  }

  const db = getFirestore();
  const templatesCollection = doctorCollection(hospitalId, branchId, doctorId, "availabilityTemplates");
  const snap = await db.collection(templatesCollection).doc(templateId).get();
  const template = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Template not found.");
  }

  await writeWithAudit(db, {
    collection: templatesCollection,
    docId: templateId,
    data: { status },
    action: "statusChange",
    before: template ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
