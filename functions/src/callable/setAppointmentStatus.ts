import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SetAppointmentStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { freeSlotAndPromoteWaitlist } from "../services/waitlist";

/**
 * FR-6.3. office only, own branch. Rejecting/cancelling a slot-backed
 * appointment frees the slot back to "approved" and, per FR-6.5, promotes
 * the earliest waiting-list entry for that doctor+date onto the
 * newly-freed slot in the same transaction.
 */
export const setAppointmentStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, appointmentId, status } = SetAppointmentStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const apptRef = db.collection("appointments").doc(appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists || appt?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (caller.branchId !== appt?.branchId) {
    throw new HttpsError("permission-denied", "You can only manage appointments in your own branch.");
  }

  const freesSlot =
    (status === "rejected" || status === "cancelled") &&
    appt?.slotId &&
    (appt?.status === "pending" || appt?.status === "approved");

  if (!freesSlot) {
    await writeWithAudit(db, {
      collection: "appointments",
      docId: appointmentId,
      data: { status },
      action: "statusChange",
      before: appt ?? null,
      context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
    });
    return { success: true };
  }

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    await freeSlotAndPromoteWaitlist(db, tx, {
      slotId: appt.slotId as string,
      doctorId: appt.doctorId as string,
      date: appt.date as string,
    });

    tx.update(apptRef, { status, updatedAt: now });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "statusChange",
      entityType: "appointments",
      entityId: appointmentId,
      before: { status: appt?.status },
      after: { status },
      createdAt: now,
    });
  });

  return { success: true };
});
