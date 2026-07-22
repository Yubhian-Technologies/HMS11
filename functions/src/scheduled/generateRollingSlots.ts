import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { addDays, overlapsAnyBreak, todayIso, toHHMM, toMinutes, weekdayOf } from "../services/datetime";

/**
 * FR-4.2. Runs nightly and generates only the single day newly entering the
 * rolling 3-day window (today+3) — the window itself stays constant because
 * this runs every night, not because any one run generates multiple days.
 * Idempotent: skips a (doctorId, date) pair that already has slots, so a
 * retried/duplicate invocation never double-generates (NFR-2.2).
 */
export const generateRollingSlots = onSchedule("every day 02:00", async () => {
  const db = getFirestore();
  const targetDate = addDays(todayIso(), 3);
  const targetWeekday = weekdayOf(targetDate);

  const templatesSnap = await db
    .collection("doctorAvailabilityTemplates")
    .where("status", "==", "active")
    .where("weekday", "==", targetWeekday)
    .get();

  for (const templateDoc of templatesSnap.docs) {
    const template = templateDoc.data();

    const existing = await db
      .collection("doctorSlots")
      .where("doctorId", "==", template.doctorId)
      .where("date", "==", targetDate)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const holidaySnap = await db
      .collection("holidays")
      .where("branchId", "==", template.branchId)
      .where("date", "==", targetDate)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (!holidaySnap.empty) continue;

    const startMin = toMinutes(template.startTime);
    const endMin = toMinutes(template.endTime);
    const duration = template.slotDurationMinutes as number;
    const breaks = (template.breaks as { start: string; end: string }[]) ?? [];
    const now = FieldValue.serverTimestamp();

    const batch = db.batch();
    let generated = 0;
    for (let t = startMin; t + duration <= endMin; t += duration) {
      if (overlapsAnyBreak(t, t + duration, breaks)) continue;
      const slotRef = db.collection("doctorSlots").doc();
      batch.set(slotRef, {
        doctorId: template.doctorId,
        date: targetDate,
        startTime: toHHMM(t),
        endTime: toHHMM(t + duration),
        status: "pendingApproval",
        generatedByTemplateId: templateDoc.id,
        hospitalId: template.hospitalId,
        branchId: template.branchId,
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      });
      generated++;
    }

    if (generated > 0) {
      const auditRef = db.collection("auditLogs").doc();
      batch.set(auditRef, {
        hospitalId: template.hospitalId,
        actorId: "system",
        actorRole: "system",
        action: "create",
        entityType: "doctorSlots",
        entityId: `generated:${template.doctorId}:${targetDate}`,
        before: null,
        after: { count: generated, templateId: templateDoc.id },
        createdAt: now,
      });
      await batch.commit();
    }
  }
});
