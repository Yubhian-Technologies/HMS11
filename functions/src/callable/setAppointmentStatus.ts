import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SetAppointmentStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { freeSlotAndPromoteWaitlist, type WaitlistPromotion } from "../services/waitlist";
import { sendNotification } from "../notifications/sendNotification";

const STATUS_MESSAGE: Record<string, { title: string; body: (appt: FirebaseFirestore.DocumentData) => string }> = {
  approved: {
    title: "Appointment confirmed",
    body: (appt) => `Your ${appt.session ?? ""} appointment on ${appt.date} is confirmed.`,
  },
  rejected: {
    title: "Appointment not approved",
    body: (appt) => `Your appointment request on ${appt.date} was not approved. Please book another session.`,
  },
  cancelled: {
    title: "Appointment cancelled",
    body: (appt) => `Your ${appt.session ?? ""} appointment on ${appt.date} was cancelled.`,
  },
};

/**
 * FR-6.3. office only, own branch. Rejecting/cancelling a session-backed
 * appointment frees its seat in the pool and, per FR-6.5, promotes the
 * earliest waiting-list entry for that doctor+date onto the newly-freed
 * seat in the same transaction.
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
    appt?.session &&
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
    await notifyStatusChange(hospitalId, appointmentId, appt, status);
    return { success: true };
  }

  const promotion: WaitlistPromotion | null = await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    const result = await freeSlotAndPromoteWaitlist(db, tx, {
      doctorId: appt.doctorId as string,
      date: appt.date as string,
      session: appt.session as "morning" | "afternoon",
      bookedVia: (appt.bookedVia as "online" | "walkin") ?? "online",
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

    return result;
  });

  await notifyStatusChange(hospitalId, appointmentId, appt, status);
  if (promotion) {
    await sendNotification({
      userId: promotion.patientId,
      type: "appointmentConfirmation",
      title: "Appointment confirmed",
      body: `A seat opened up — your ${promotion.session} appointment on ${promotion.date} is now confirmed.`,
      hospitalId,
      relatedEntityId: promotion.appointmentId,
    });
  }

  return { success: true };
});

async function notifyStatusChange(
  hospitalId: string,
  appointmentId: string,
  appt: FirebaseFirestore.DocumentData | undefined,
  status: string,
): Promise<void> {
  const message = STATUS_MESSAGE[status];
  if (!message || !appt) return;
  await sendNotification({
    userId: appt.patientId as string,
    type: "appointmentConfirmation",
    title: message.title,
    body: message.body(appt),
    hospitalId,
    relatedEntityId: appointmentId,
  });
}
