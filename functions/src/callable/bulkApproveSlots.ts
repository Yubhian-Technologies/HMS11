import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { BulkApproveSlotsRequest, BulkApproveSlotsResponse, doctorCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Doctor bulk-confirms every Office-proposed (`proposed`) slot for one date,
 * accepting Office's proposed totals as-is — the "no changes needed"
 * shortcut so a doctor doesn't have to open each of a day's proposals one at
 * a time. Individual adjustment still goes through submitSlotProposal. The
 * online/walk-in split still happens afterward, at Office's publish step.
 */
export const bulkApproveSlots = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const { hospitalId, doctorId, date } = BulkApproveSlotsRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.uid !== doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only confirm their own slots.");
  }

  const db = getFirestore();
  const slotsCollection = doctorCollection(hospitalId, caller.branchId!, doctorId, "slots");
  const snap = await db
    .collection(slotsCollection)
    .where("date", "==", date)
    .where("status", "==", "proposed")
    .get();

  if (snap.empty) {
    return BulkApproveSlotsResponse.parse({ confirmedCount: 0 });
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "doctorReviewed", updatedAt: now });
  });
  const auditRef = db.collection("auditLogs").doc();
  batch.set(auditRef, {
    hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "statusChange",
    entityType: "doctorSlots",
    entityId: `bulk:${doctorId}:${date}`,
    before: { status: "proposed" },
    after: { status: "doctorReviewed", count: snap.size },
    createdAt: now,
  });
  await batch.commit();

  return BulkApproveSlotsResponse.parse({ confirmedCount: snap.size });
});
