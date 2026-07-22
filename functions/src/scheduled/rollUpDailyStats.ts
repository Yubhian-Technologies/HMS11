import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { addDays, todayIso } from "../services/datetime";

/**
 * FR-19.1 / FR-19.2. Recomputes yesterday's per-branch dailyStats doc
 * (docs/13-cloud-functions.md §13.2, doc09 §9.7) so the Super Admin/Admin
 * analytics dashboards are O(1) reads instead of scanning appointments/
 * invoices/beds live on every page load.
 *
 * `revenue` sums invoices.paidAmount for invoices *created* that day, not
 * payments *recorded* that day — there's no separate payment-event log in
 * the schema to attribute a later partial payment to the day it happened,
 * so a payment made after the invoice's creation day is not reflected here.
 * Documented simplification, not a bug.
 */
export const rollUpDailyStats = onSchedule("every day 01:00", async () => {
  const db = getFirestore();
  const date = addDays(todayIso(), -1);
  const startOfDay = Timestamp.fromDate(new Date(`${date}T00:00:00.000Z`));
  const endOfDay = Timestamp.fromDate(new Date(`${date}T23:59:59.999Z`));

  const hospitalsSnap = await db.collection("hospitals").where("status", "==", "active").get();

  await Promise.all(
    hospitalsSnap.docs.map(async (hospitalDoc) => {
      const hospitalId = hospitalDoc.id;
      const branchesSnap = await db
        .collection(`hospitals/${hospitalId}/branches`)
        .where("status", "==", "active")
        .get();

      await Promise.all(
        branchesSnap.docs.map(async (branchDoc) => {
          const branchId = branchDoc.id;

          const [
            appointmentsCount,
            completedAppointmentsCount,
            approvedSlotsCount,
            newPatientsCount,
            invoicesSnap,
            totalBedsCount,
            occupiedBedsCount,
          ] = await Promise.all([
            db.collection("appointments").where("branchId", "==", branchId).where("date", "==", date).count().get(),
            db
              .collection("appointments")
              .where("branchId", "==", branchId)
              .where("date", "==", date)
              .where("status", "==", "completed")
              .count()
              .get(),
            db
              .collection("doctorSlots")
              .where("branchId", "==", branchId)
              .where("date", "==", date)
              .where("status", "==", "approved")
              .count()
              .get(),
            db
              .collection("patients")
              .where("hospitalId", "==", hospitalId)
              .where("branchId", "==", branchId)
              .where("createdAt", ">=", startOfDay)
              .where("createdAt", "<=", endOfDay)
              .count()
              .get(),
            db
              .collection("invoices")
              .where("branchId", "==", branchId)
              .where("status", "in", ["partial", "paid"])
              .where("createdAt", ">=", startOfDay)
              .where("createdAt", "<=", endOfDay)
              .get(),
            db.collection("beds").where("branchId", "==", branchId).count().get(),
            db.collection("beds").where("branchId", "==", branchId).where("status", "==", "occupied").count().get(),
          ]);

          const revenue = invoicesSnap.docs.reduce((sum, doc) => sum + (doc.data().paidAmount ?? 0), 0);

          await db
            .collection("dailyStats")
            .doc(`${branchId}_${date}`)
            .set({
              hospitalId,
              branchId,
              date,
              appointmentsCount: appointmentsCount.data().count,
              completedAppointmentsCount: completedAppointmentsCount.data().count,
              approvedSlotsCount: approvedSlotsCount.data().count,
              newPatientsCount: newPatientsCount.data().count,
              revenue,
              totalBedsCount: totalBedsCount.data().count,
              occupiedBedsCount: occupiedBedsCount.data().count,
              updatedAt: FieldValue.serverTimestamp(),
            });
        }),
      );
    }),
  );
});
