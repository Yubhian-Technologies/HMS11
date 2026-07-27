import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { branchCollection, doctorCollection, type Session } from "@hms/shared";
import { addDays, todayIso, weekdayOf } from "../services/datetime";

const SESSIONS: { key: Session; countField: "morningSlots" | "afternoonSlots"; reservedField: "morningWalkInReserved" | "afternoonWalkInReserved" }[] = [
  { key: "morning", countField: "morningSlots", reservedField: "morningWalkInReserved" },
  { key: "afternoon", countField: "afternoonSlots", reservedField: "afternoonWalkInReserved" },
];

/**
 * FR-4.2. Runs nightly and generates only the single day newly entering the
 * rolling 3-day window (today+3) — the window itself stays constant because
 * this runs every night, not because any one run generates multiple days.
 * One pool doc per (doctor, date, session), keyed by a deterministic id —
 * idempotent by construction (a retried/duplicate invocation just no-ops on
 * `create()` failing for a doc that already exists, NFR-2.2), no query
 * needed to check for prior generation.
 *
 * `availabilityTemplates` is nested under `.../doctors/{doctorId}/` now
 * (docs/10-collections-schema.md) — this scan runs across every
 * hospital/branch/doctor, so it must use `collectionGroup()`, backed by the
 * `(status, weekday)` collection-group index in firestore.indexes.json.
 */
export const generateRollingSlots = onSchedule("every day 02:00", async () => {
  const db = getFirestore();
  const targetDate = addDays(todayIso(), 3);
  const targetWeekday = weekdayOf(targetDate);

  const templatesSnap = await db
    .collectionGroup("availabilityTemplates")
    .where("status", "==", "active")
    .where("weekday", "==", targetWeekday)
    .get();

  for (const templateDoc of templatesSnap.docs) {
    const template = templateDoc.data();
    // templateDoc.ref.path = hospitals/{h}/branches/{b}/doctors/{doctorId}/availabilityTemplates/{id}
    const doctorId = templateDoc.ref.parent.parent!.id;

    const holidaySnap = await db
      .collection(branchCollection(template.hospitalId, template.branchId, "holidays"))
      .where("date", "==", targetDate)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (!holidaySnap.empty) continue;

    const now = FieldValue.serverTimestamp();

    for (const { key, countField, reservedField } of SESSIONS) {
      const totalCount = (template[countField] as number) ?? 0;
      if (totalCount <= 0) continue;

      const poolRef = db
        .collection(doctorCollection(template.hospitalId, template.branchId, doctorId, "slots"))
        .doc(`${targetDate}_${key}`);
      try {
        await poolRef.create({
          doctorId,
          date: targetDate,
          session: key,
          totalCount,
          walkInReserved: (template[reservedField] as number) ?? 0,
          onlineBookedCount: 0,
          walkInBookedCount: 0,
          status: "pendingApproval",
          generatedByTemplateId: templateDoc.id,
          hospitalId: template.hospitalId,
          branchId: template.branchId,
          createdBy: "system",
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        // Doc already exists — already generated for this (doctor, date, session).
        continue;
      }

      const auditRef = db.collection("auditLogs").doc();
      await auditRef.set({
        hospitalId: template.hospitalId,
        actorId: "system",
        actorRole: "system",
        action: "create",
        entityType: "doctorSlots",
        entityId: poolRef.id,
        before: null,
        after: { totalCount, templateId: templateDoc.id },
        createdAt: now,
      });
    }
  }
});
