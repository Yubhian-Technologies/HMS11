import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RespondAvailabilityRequestRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** doctor only, own request — confirms actual capacity and overall availability. */
export const respondAvailabilityRequest = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = RespondAvailabilityRequestRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  const snap = await db.collection("availabilityRequests").doc(input.requestId).get();
  const existing = snap.data();
  if (!snap.exists || existing?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Availability request not found.");
  }
  if (existing?.doctorId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only respond to your own availability requests.");
  }

  await writeWithAudit(db, {
    collection: "availabilityRequests",
    docId: input.requestId,
    data: {
      morningAvailable: input.morningAvailable,
      afternoonAvailable: input.afternoonAvailable,
      isAvailable: input.isAvailable,
      status: "responded",
      respondedAt: FieldValue.serverTimestamp(),
    },
    action: "update",
    before: existing,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return { success: true };
});
