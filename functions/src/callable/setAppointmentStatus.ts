import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SetAppointmentStatusRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { freeSlotAndPromoteWaitlist, type WaitlistPromotion } from "../services/waitlist";
import { sendNotification } from "../notifications/sendNotification";

const STATUS_MESSAGE: Record<string, { title: string; body: (appt: FirebaseFirestore.DocumentData) => string }> = {
  BOOKED: {
    title: "Appointment confirmed",
    body: (appt) => `Your ${appt.session ?? ""} appointment on ${appt.date} is confirmed.`,
  },
  REJECTED: {
    title: "Appointment not approved",
    body: (appt) => `Your appointment request on ${appt.date} was not approved. Please book another session.`,
  },
  CANCELLED: {
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
  const { hospitalId, branchId, appointmentId, status } = SetAppointmentStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only manage appointments in your own branch.");
  }

  const db = getFirestore();
  const apptRef = db.collection(branchCollection(hospitalId, branchId, "appointments")).doc(appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found.");
  }

  const freesSlot =
    (status === "REJECTED" || status === "CANCELLED") &&
    appt?.session &&
    (appt?.status === "PENDING" || appt?.status === "BOOKED");

  if (!freesSlot) {
    await writeWithAudit(db, {
      collection: branchCollection(hospitalId, branchId, "appointments"),
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
      hospitalId,
      branchId,
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
