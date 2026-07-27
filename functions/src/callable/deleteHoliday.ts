import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { DeleteHolidayRequest, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-3.4. admin only, own hospital. The one true hard-delete in the app —
 * holidays are a non-clinical scheduling record, so this is a deliberate,
 * narrow exception to NFR-7.1 ("no hard deletes anywhere") rather than the
 * general pattern every other collection follows (disable/enable only).
 * Bypasses writeWithAudit (which only ever sets/merges) and writes its own
 * audit entry with action "delete" in the same transaction as the delete.
 */
export const deleteHoliday = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, branchId, holidayId } = DeleteHolidayRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const ref = db.collection(branchCollection(hospitalId, branchId, "holidays")).doc(holidayId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Holiday not found.");
  }

  await db.runTransaction(async (tx) => {
    tx.delete(ref);
    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "delete",
      entityType: "holidays",
      entityId: holidayId,
      before: snap.data() ?? null,
      after: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});
