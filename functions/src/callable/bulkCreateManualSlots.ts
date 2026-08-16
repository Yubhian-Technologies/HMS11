import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  BulkCreateManualSlotsRequest,
  BulkCreateManualSlotsResponse,
  doctorPath,
  doctorCollection,
  type Session,
} from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { addDays, todayIso } from "../services/datetime";

const WINDOW_DAYS = 3;

/**
 * Office only, own branch — Phase A step 1 ("Office initiates a rolling
 * 3-day slot request"). Applies one morning count + one afternoon count
 * across every day in the current rolling 3-day window (today, today+1,
 * today+2) for one doctor, instead of six separate createManualSlot calls.
 * Each (date, session) pair uses the exact same create-or-top-up semantics
 * as createManualSlot (new pool starts "proposed"; an existing pool's total
 * is topped up, status untouched) — this is a batching convenience over
 * that same primitive, not a new capacity-creation path.
 */
export const bulkCreateManualSlots = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const input = BulkCreateManualSlotsRequest.parse(request.data);
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
  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(todayIso(), i));
  const sessions: { key: Session; count: number }[] = [
    { key: "morning", count: input.morningCount },
    { key: "afternoon", count: input.afternoonCount },
  ];

  const now = FieldValue.serverTimestamp();
  const slotIds: string[] = [];

  for (const date of dates) {
    for (const { key, count } of sessions) {
      if (count <= 0) continue;

      const poolRef = db.collection(slotsCollection).doc(`${date}_${key}`);
      const poolSnap = await poolRef.get();

      if (!poolSnap.exists) {
        await poolRef.set({
          doctorId: input.doctorId,
          date,
          session: key,
          totalCount: count,
          walkInReserved: 0,
          checkInCutoffMinutes: 15,
          onlineBookedCount: 0,
          walkInBookedCount: 0,
          status: "proposed",
          hospitalId: input.hospitalId,
          branchId: input.branchId,
          createdBy: caller.uid,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await poolRef.update({ totalCount: FieldValue.increment(count), updatedAt: now });
      }

      slotIds.push(poolRef.id);
    }
  }

  const auditRef = db.collection("auditLogs").doc();
  await auditRef.set({
    hospitalId: input.hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "create",
    entityType: "doctorSlots",
    entityId: `bulk:${input.doctorId}:${dates[0]}..${dates[dates.length - 1]}`,
    before: null,
    after: {
      doctorId: input.doctorId,
      morningCount: input.morningCount,
      afternoonCount: input.afternoonCount,
      slotCount: slotIds.length,
    },
    createdAt: now,
  });

  return BulkCreateManualSlotsResponse.parse({ slotIds });
});
