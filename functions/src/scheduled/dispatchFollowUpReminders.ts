import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { sendNotification } from "../notifications/sendNotification";
import { addDays, todayIso } from "../services/datetime";

/**
 * FR-16.1 "follow-up reminder". Runs once daily, reminding patients of a
 * follow-up scheduled for tomorrow that they haven't booked yet
 * (`resultingAppointmentId == null`) — idempotent the same way as
 * dispatchAppointmentReminders (the target date changes every run).
 *
 * `followUps` is nested per branch now — this scan runs across every
 * hospital/branch, so it uses `collectionGroup()`.
 */
export const dispatchFollowUpReminders = onSchedule("every day 08:00", async () => {
  const db = getFirestore();
  const tomorrow = addDays(todayIso(), 1);

  const snap = await db
    .collectionGroup("followUps")
    .where("scheduledDate", "==", tomorrow)
    .where("resultingAppointmentId", "==", null)
    .get();

  await Promise.all(
    snap.docs.map((doc) => {
      const followUp = doc.data();
      return sendNotification({
        userId: followUp.patientId,
        type: "followUpReminder",
        title: "Follow-up due tomorrow",
        body: "Your doctor recommended a follow-up visit tomorrow — book your slot.",
        hospitalId: followUp.hospitalId,
        relatedEntityId: doc.id,
      });
    }),
  );
});
