import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { BulkApproveSlotsRequest, BulkApproveSlotsResponse, doctorCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-4.4 — doctor bulk-approves every pendingApproval slot for one date. No
 * `branchId` in the request — doctor is branch-scoped by claim, so
 * `caller.branchId` locates the nested `slots` collection (same pattern as
 * `setBedStatus`/`respondAvailabilityRequest`).
 */
export const bulkApproveSlots = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const { hospitalId, doctorId, date } = BulkApproveSlotsRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.uid !== doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only approve their own slots.");
  }

  const db = getFirestore();
  const slotsCollection = doctorCollection(hospitalId, caller.branchId!, doctorId, "slots");
  const snap = await db
    .collection(slotsCollection)
    .where("date", "==", date)
    .where("status", "==", "pendingApproval")
    .get();

  if (snap.empty) {
    return BulkApproveSlotsResponse.parse({ approvedCount: 0 });
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "approved", updatedAt: now });
  });
  const auditRef = db.collection("auditLogs").doc();
  batch.set(auditRef, {
    hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "statusChange",
    entityType: "doctorSlots",
    entityId: `bulk:${doctorId}:${date}`,
    before: { status: "pendingApproval" },
    after: { status: "approved", count: snap.size },
    createdAt: now,
  });
  await batch.commit();

  return BulkApproveSlotsResponse.parse({ approvedCount: snap.size });
});
