import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CreateManualSlotRequest, CreateManualSlotResponse, doctorPath, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Office only, own branch — the sole way a capacity pool originates. Creates
 * a session pool as `proposed` — it is NOT bookable until the doctor
 * confirms the total (submitSlotProposal) and Office splits + releases it
 * (setSlotStatus → `approved`). If the (doctorId, date, session) pool
 * already exists, top up its total instead of creating a duplicate; its
 * status is left untouched. The online/walk-in split is deliberately not
 * set here — that's Office's decision at publish time, after the doctor has
 * confirmed the total (Phase A: confirm-then-split, not split-then-confirm).
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
        walkInReserved: 0,
        checkInCutoffMinutes: 15,
        onlineBookedCount: 0,
        walkInBookedCount: 0,
        status: "proposed",
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
    data: { totalCount: FieldValue.increment(input.count) },
    action: "update",
    before: pool,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateManualSlotResponse.parse({ slotId: poolRef.id });
});
