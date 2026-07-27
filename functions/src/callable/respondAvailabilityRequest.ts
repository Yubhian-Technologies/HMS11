import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RespondAvailabilityRequestRequest, branchCollection, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

/**
 * doctor only, own request — confirms actual capacity and overall
 * availability. No `branchId` in the request — doctor is branch-scoped by
 * claim, so `caller.branchId` locates the nested `availabilityRequests`
 * collection (same pattern as `setBedStatus`).
 */
export const respondAvailabilityRequest = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = RespondAvailabilityRequestRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  const branchId = caller.branchId!;
  const requestsCollection = branchCollection(input.hospitalId, branchId, "availabilityRequests");
  const snap = await db.collection(requestsCollection).doc(input.requestId).get();
  const existing = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Availability request not found.");
  }
  if (existing?.doctorId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only respond to your own availability requests.");
  }

  await writeWithAudit(db, {
    collection: requestsCollection,
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

  // A confirmed response is a real capacity commitment, not just a record —
  // provision (or top up) the matching doctorSlots pool(s) so the date
  // actually becomes bookable, the same way Office's one-off manual slots
  // do (createManualSlot.ts). Without this, "accepting" a request never
  // produced any bookable slot: office/doctor-availability only ever showed
  // the confirmation text, and patients/reception never saw the capacity.
  const sessionCounts: { key: "morning" | "afternoon"; count: number }[] = [
    { key: "morning", count: input.morningAvailable },
    { key: "afternoon", count: input.afternoonAvailable },
  ];

  const slotsCollection = doctorCollection(input.hospitalId, branchId, caller.uid, "slots");

  if (input.isAvailable) {
    for (const { key, count } of sessionCounts) {
      if (count <= 0) continue;

      const poolRef = db.collection(slotsCollection).doc(`${existing!.date}_${key}`);
      const poolSnap = await poolRef.get();

      if (!poolSnap.exists) {
        await writeWithAudit(db, {
          collection: slotsCollection,
          docId: poolRef.id,
          data: {
            doctorId: caller.uid,
            date: existing!.date,
            session: key,
            totalCount: count,
            walkInReserved: 0,
            onlineBookedCount: 0,
            walkInBookedCount: 0,
            status: "approved",
            generatedByTemplateId: null,
            hospitalId: input.hospitalId,
            branchId,
            createdBy: caller.uid,
          },
          action: "create",
          context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
        });
      } else {
        const pool = poolSnap.data();
        await writeWithAudit(db, {
          collection: slotsCollection,
          docId: poolRef.id,
          data: { totalCount: FieldValue.increment(count) },
          action: "update",
          before: pool,
          context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
        });
      }
    }
  }

  if (existing?.createdBy) {
    await sendNotification({
      userId: existing.createdBy as string,
      type: "availabilityRequest",
      title: "Doctor responded to your availability request",
      body: `${input.isAvailable ? "Available" : "Not available"} — ${input.morningAvailable} morning / ${input.afternoonAvailable} afternoon confirmed for ${existing.date}.`,
      hospitalId: input.hospitalId,
      relatedEntityId: input.requestId,
    });
  }

  return { success: true };
});
