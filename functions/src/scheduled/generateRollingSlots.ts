import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { AVAILABILITY_WINDOWS } from "@hms/shared";
import { addDays, overlapsAnyBreak, todayIso, toHHMM, toMinutes, weekdayOf } from "../services/datetime";

/**
 * Fills a session (morning/afternoon) with up to `count` consecutive
 * `duration`-minute slots starting at the session's fixed window start,
 * skipping any that overlap a break — bounded by the window's own end so a
 * heavily broken-up window can never run past it (it just yields fewer
 * slots than requested rather than overflowing into the next session).
 */
function generateSessionSlots(params: {
  batch: WriteBatch;
  db: FirebaseFirestore.Firestore;
  windowStart: string;
  windowEnd: string;
  count: number;
  duration: number;
  breaks: { start: string; end: string }[];
  base: Record<string, unknown>;
}): number {
  const { batch, db, windowStart, windowEnd, count, duration, breaks, base } = params;
  const endMin = toMinutes(windowEnd);
  let t = toMinutes(windowStart);
  let made = 0;
  while (made < count && t + duration <= endMin) {
    if (!overlapsAnyBreak(t, t + duration, breaks)) {
      const slotRef = db.collection("doctorSlots").doc();
      batch.set(slotRef, { ...base, startTime: toHHMM(t), endTime: toHHMM(t + duration) });
      made++;
    }
    t += duration;
  }
  return made;
}

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

    const duration = template.slotDurationMinutes as number;
    const breaks = (template.breaks as { start: string; end: string }[]) ?? [];
    const now = FieldValue.serverTimestamp();

    const batch = db.batch();
    const base = {
      doctorId: template.doctorId,
      date: targetDate,
      status: "pendingApproval",
      generatedByTemplateId: templateDoc.id,
      hospitalId: template.hospitalId,
      branchId: template.branchId,
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
    };

    let generated = 0;
    generated += generateSessionSlots({
      batch,
      db,
      windowStart: AVAILABILITY_WINDOWS.morning.start,
      windowEnd: AVAILABILITY_WINDOWS.morning.end,
      count: (template.morningSlots as number) ?? 0,
      duration,
      breaks,
      base,
    });
    generated += generateSessionSlots({
      batch,
      db,
      windowStart: AVAILABILITY_WINDOWS.afternoon.start,
      windowEnd: AVAILABILITY_WINDOWS.afternoon.end,
      count: (template.afternoonSlots as number) ?? 0,
      duration,
      breaks,
      base,
    });

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
