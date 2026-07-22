import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RescheduleAppointmentRequest } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { freeSlotAndPromoteWaitlist, type WaitlistPromotion } from "../services/waitlist";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-6.3. office only, own branch. Moves an appointment onto a different
 * approved+unbooked slot, freeing the old one (with waiting-list promotion,
 * FR-6.5, same as reject/cancel) and booking the new one. Office performing
 * the reschedule implies approval, so the appointment lands "approved"
 * regardless of its prior status.
 */
export const rescheduleAppointment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, appointmentId, newSlotId } = RescheduleAppointmentRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const apptRef = db.collection("appointments").doc(appointmentId);
  const [apptSnap, newSlotSnap] = await Promise.all([
    apptRef.get(),
    db.collection("doctorSlots").doc(newSlotId).get(),
  ]);
  const appt = apptSnap.data();
  const newSlot = newSlotSnap.data();

  if (!apptSnap.exists || appt?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (caller.branchId !== appt?.branchId) {
    throw new HttpsError("permission-denied", "You can only manage appointments in your own branch.");
  }
  if (!newSlotSnap.exists || newSlot?.hospitalId !== hospitalId || newSlot?.branchId !== appt.branchId) {
    throw new HttpsError("not-found", "New slot not found.");
  }
  if (newSlot?.doctorId !== appt.doctorId) {
    throw new HttpsError("invalid-argument", "The new slot must belong to the same doctor.");
  }
  if (newSlot?.status !== "approved") {
    throw new HttpsError("failed-precondition", "The new slot is not available.");
  }

  const promotion: WaitlistPromotion | null = await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    const result = appt.slotId
      ? await freeSlotAndPromoteWaitlist(db, tx, {
          slotId: appt.slotId as string,
          doctorId: appt.doctorId as string,
          date: appt.date as string,
        })
      : null;

    tx.update(db.collection("doctorSlots").doc(newSlotId), { status: "booked", updatedAt: now });
    tx.update(apptRef, {
      slotId: newSlotId,
      date: newSlot?.date,
      startTime: newSlot?.startTime,
      status: "approved",
      updatedAt: now,
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "update",
      entityType: "appointments",
      entityId: appointmentId,
      before: { slotId: appt.slotId, date: appt.date, startTime: appt.startTime },
      after: { slotId: newSlotId, date: newSlot?.date, startTime: newSlot?.startTime },
      createdAt: now,
    });

    return result;
  });

  await sendNotification({
    userId: appt.patientId as string,
    type: "appointmentConfirmation",
    title: "Appointment rescheduled",
    body: `Your appointment is now confirmed for ${newSlot?.date} at ${newSlot?.startTime}.`,
    hospitalId,
    relatedEntityId: appointmentId,
  });
  if (promotion) {
    await sendNotification({
      userId: promotion.patientId,
      type: "appointmentConfirmation",
      title: "Appointment confirmed",
      body: `A slot opened up — your appointment on ${promotion.date} at ${promotion.startTime ?? "your assigned time"} is now confirmed.`,
      hospitalId,
      relatedEntityId: promotion.appointmentId,
    });
  }

  return { success: true };
});
