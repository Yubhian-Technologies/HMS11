import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CreateManualSlotRequest, CreateManualSlotResponse, doctorPath, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-4.5. office only, own branch. Adds capacity outside the doctor's
 * recurring template: if the (doctorId, date, session) pool doesn't exist
 * yet, creates it going straight to "approved" — Office is acting on the
 * doctor's behalf (e.g. an extra covering shift confirmed out of band), so a
 * second approval step would just be friction. If the pool already exists
 * (the template already generated one for that session), tops up its count
 * instead of creating a duplicate.
 */
export const createManualSlot = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const input = CreateManualSlotRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only add slots in your own branch.");
  }

  const db = getFirestore();
  const doctorSnap = await db.doc(doctorPath(input.hospitalId, input.branchId, input.doctorId)).get();
  if (!doctorSnap.exists) {
    throw new HttpsError("not-found", "Doctor not found in this branch.");
  }

  const slotsCollection = doctorCollection(input.hospitalId, input.branchId, input.doctorId, "slots");
  const poolRef = db.collection(slotsCollection).doc(`${input.date}_${input.session}`);
  const poolSnap = await poolRef.get();

  if (!poolSnap.exists) {
    await writeWithAudit(db, {
      collection: slotsCollection,
      docId: poolRef.id,
      data: {
        doctorId: input.doctorId,
        date: input.date,
        session: input.session,
        totalCount: input.count,
        walkInReserved: input.walkInReserved,
        onlineBookedCount: 0,
        walkInBookedCount: 0,
        status: "approved",
        generatedByTemplateId: null,
        hospitalId: input.hospitalId,
        branchId: input.branchId,
        createdBy: caller.uid,
      },
      action: "create",
      context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
    });
    return CreateManualSlotResponse.parse({ slotId: poolRef.id });
  }

  const pool = poolSnap.data();

  await writeWithAudit(db, {
    collection: slotsCollection,
    docId: poolRef.id,
    data: {
      totalCount: FieldValue.increment(input.count),
      walkInReserved: FieldValue.increment(input.walkInReserved),
    },
    action: "update",
    before: pool,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateManualSlotResponse.parse({ slotId: poolRef.id });
});
