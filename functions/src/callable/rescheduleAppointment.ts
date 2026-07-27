import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RescheduleAppointmentRequest, branchCollection, doctorCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { freeSlotAndPromoteWaitlist, type WaitlistPromotion } from "../services/waitlist";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-6.3. office only, own branch. Moves an appointment onto a different
 * approved session pool for the same doctor, freeing the old one (with
 * waiting-list promotion, FR-6.5, same as reject/cancel) and claiming a seat
 * in the new one. A reschedule relocates an existing booking rather than
 * making a fresh claim, so it draws from the *same* bucket
 * (`bookedVia`) the appointment already held — it never consumes
 * walk-in-reserved capacity just by being moved. Office performing the
 * reschedule implies approval, so the appointment lands "approved"
 * regardless of its prior status.
 */
export const rescheduleAppointment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, branchId, appointmentId, newDate, newSession } = RescheduleAppointmentRequest.parse(
    request.data,
  );
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only manage appointments in your own branch.");
  }

  const db = getFirestore();
  const apptRef = db.collection(branchCollection(hospitalId, branchId, "appointments")).doc(appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();

  if (!appt) {
    throw new HttpsError("not-found", "Appointment not found.");
  }

  const bookedVia = (appt.bookedVia as "online" | "walkin" | null) ?? "online";
  const newPoolRef = db
    .collection(doctorCollection(hospitalId, branchId, appt.doctorId as string, "slots"))
    .doc(`${newDate}_${newSession}`);
  const bucketField = bookedVia === "online" ? "onlineBookedCount" : "walkInBookedCount";

  const promotion: WaitlistPromotion | null = await db.runTransaction(async (tx) => {
    const newPoolSnap = await tx.get(newPoolRef);
    const newPool = newPoolSnap.data();
    if (!newPoolSnap.exists) {
      throw new HttpsError("not-found", "New session not found.");
    }
    if (newPool?.status !== "approved") {
      throw new HttpsError("failed-precondition", "The new session is not available.");
    }
    const remaining =
      bookedVia === "online"
        ? Math.max(0, (newPool.totalCount as number) - (newPool.walkInReserved as number) - (newPool.onlineBookedCount as number))
        : Math.max(0, (newPool.walkInReserved as number) - (newPool.walkInBookedCount as number));
    if (remaining <= 0) {
      throw new HttpsError("failed-precondition", "The new session is fully booked.");
    }

    const now = FieldValue.serverTimestamp();

    const result = appt.session
      ? await freeSlotAndPromoteWaitlist(db, tx, {
          hospitalId,
          branchId,
          doctorId: appt.doctorId as string,
          date: appt.date as string,
          session: appt.session as "morning" | "afternoon",
          bookedVia,
        })
      : null;

    tx.update(newPoolRef, { [bucketField]: FieldValue.increment(1), updatedAt: now });
    tx.update(apptRef, {
      date: newDate,
      session: newSession,
      status: "BOOKED",
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
      before: { date: appt.date, session: appt.session },
      after: { date: newDate, session: newSession },
      createdAt: now,
    });

    return result;
  });

  await sendNotification({
    userId: appt.patientId as string,
    type: "appointmentConfirmation",
    title: "Appointment rescheduled",
    body: `Your appointment is now confirmed for ${newDate} (${newSession} session).`,
    hospitalId,
    relatedEntityId: appointmentId,
  });
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
