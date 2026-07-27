import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateAvailabilityTemplateRequest, CreateAvailabilityTemplateResponse, doctorPath, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/** FR-4.1. admin (delegated) or doctor (own only). */
export const createAvailabilityTemplate = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "doctor"]);
  const input = CreateAvailabilityTemplateRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.role === "doctor" && caller.uid !== input.doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only manage their own availability.");
  }

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const doctorSnap = await db.doc(doctorPath(input.hospitalId, input.branchId, input.doctorId)).get();
  if (!doctorSnap.exists) {
    throw new HttpsError("not-found", "Doctor not found in this branch.");
  }

  const templateId = await writeWithAudit(db, {
    collection: doctorCollection(input.hospitalId, input.branchId, input.doctorId, "availabilityTemplates"),
    data: {
      doctorId: input.doctorId,
      weekday: input.weekday,
      morningSlots: input.morningSlots,
      afternoonSlots: input.afternoonSlots,
      morningWalkInReserved: input.morningWalkInReserved,
      afternoonWalkInReserved: input.afternoonWalkInReserved,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateAvailabilityTemplateResponse.parse({ templateId });
});
