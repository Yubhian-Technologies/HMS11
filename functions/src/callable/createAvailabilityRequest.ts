import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateAvailabilityRequestRequest, CreateAvailabilityRequestResponse, doctorPath, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

/** office only, own branch — asks a doctor to confirm capacity for a date. */
export const createAvailabilityRequest = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const input = CreateAvailabilityRequestRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only request availability in your own branch.");
  }

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const doctorSnap = await db.doc(doctorPath(input.hospitalId, input.branchId, input.doctorId)).get();
  if (!doctorSnap.exists) {
    throw new HttpsError("not-found", "Doctor not found in this branch.");
  }

  const requestId = await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "availabilityRequests"),
    data: {
      doctorId: input.doctorId,
      date: input.date,
      morningRequested: input.morningRequested,
      afternoonRequested: input.afternoonRequested,
      status: "pending",
      morningAvailable: null,
      afternoonAvailable: null,
      isAvailable: null,
      respondedAt: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  await sendNotification({
    userId: input.doctorId,
    type: "availabilityRequest",
    title: "Office needs your availability",
    body: `Office asked for ${input.morningRequested} morning / ${input.afternoonRequested} afternoon slots on ${input.date}.`,
    hospitalId: input.hospitalId,
    relatedEntityId: requestId,
  });

  return CreateAvailabilityRequestResponse.parse({ requestId });
});
