import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-16.1 "medicine reminder". Runs every 15 minutes; `reminderSentAt` is
 * the idempotency guard (NFR-2.2) — without it, a due-but-still-pending
 * entry would get re-notified on every single run until the patient marks
 * it, since "pending" alone doesn't change between runs.
 *
 * `medicineLogs` is nested per branch now (it carries hospitalId/branchId —
 * dispensed at a specific branch) — this scan runs across every
 * hospital/branch, so it uses `collectionGroup()`.
 */
export const dispatchMedicineReminders = onSchedule("every 15 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const snap = await db
    .collectionGroup("medicineLogs")
    .where("patientStatus", "==", "pending")
    .where("reminderSentAt", "==", null)
    .where("scheduledAt", "<=", now)
    .limit(200)
    .get();

  await Promise.all(
    snap.docs.map(async (doc) => {
      const log = doc.data();
      await sendNotification({
        userId: log.patientId,
        type: "medicineReminder",
        title: "Medicine reminder",
        body: "You have a dose scheduled — mark it taken, missed, or skipped in Recovery Tracking.",
        hospitalId: log.hospitalId,
        relatedEntityId: doc.id,
      });
      await doc.ref.update({ reminderSentAt: FieldValue.serverTimestamp() });
    }),
  );
});
