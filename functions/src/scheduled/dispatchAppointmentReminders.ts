import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { sendNotification } from "../notifications/sendNotification";
import { addDays, todayIso } from "../services/datetime";

/**
 * FR-16.1 "appointment reminder". Runs once daily and reminds patients of
 * tomorrow's confirmed appointments — a day-ahead reminder rather than
 * doc13.2's originally-sketched hourly cadence, because running once per
 * calendar day is trivially idempotent (the target date changes every run,
 * so there's no risk of double-notifying the same appointment) without
 * needing a "reminded" flag, unlike dispatchMedicineReminders below.
 */
export const dispatchAppointmentReminders = onSchedule("every day 08:00", async () => {
  const db = getFirestore();
  const tomorrow = addDays(todayIso(), 1);

  const snap = await db
    .collection("appointments")
    .where("date", "==", tomorrow)
    .where("status", "==", "approved")
    .get();

  await Promise.all(
    snap.docs.map((doc) => {
      const appt = doc.data();
      return sendNotification({
        userId: appt.patientId,
        type: "appointmentReminder",
        title: "Appointment tomorrow",
        body: `You have an appointment tomorrow${appt.session ? ` (${appt.session} session)` : ""}.`,
        hospitalId: appt.hospitalId,
        relatedEntityId: doc.id,
      });
    }),
  );
});
