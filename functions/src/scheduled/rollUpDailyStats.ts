import { onSchedule } from "firebase-functions/v2/scheduler";
import { AggregateField, FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { branchCollection } from "@hms/shared";
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
          // doctorSlots is now nested per-doctor (.../doctors/{uid}/slots) —
          // the approved-slot-capacity aggregate needs a collectionGroup
          // scan filtered back down to this branch via the denormalized
          // branchId field (the path alone can't scope a collectionGroup
          // query across an unknown set of doctors).
          const [
            appointmentsCount,
            completedAppointmentsCount,
            approvedSlotsCount,
            newPatientsCount,
            invoicesSnap,
            totalBedsCount,
            occupiedBedsCount,
          ] = await Promise.all([
            db.collection(branchCollection(hospitalId, branchId, "appointments")).where("date", "==", date).count().get(),
            db
              .collection(branchCollection(hospitalId, branchId, "appointments"))
              .where("date", "==", date)
              .where("status", "==", "COMPLETED")
              .count()
              .get(),
            db
              .collectionGroup("slots")
              .where("branchId", "==", branchId)
              .where("date", "==", date)
              .where("status", "==", "approved")
              .aggregate({ totalSlots: AggregateField.sum("totalCount") })
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
              .collection(branchCollection(hospitalId, branchId, "invoices"))
              .where("status", "in", ["partial", "paid"])
              .where("createdAt", ">=", startOfDay)
              .where("createdAt", "<=", endOfDay)
              .get(),
            db.collection(branchCollection(hospitalId, branchId, "beds")).count().get(),
            db.collection(branchCollection(hospitalId, branchId, "beds")).where("status", "==", "occupied").count().get(),
          ]);

          const revenue = invoicesSnap.docs.reduce((sum, doc) => sum + (doc.data().paidAmount ?? 0), 0);

          await db
            .collection(branchCollection(hospitalId, branchId, "dailyStats"))
            .doc(date)
            .set({
              hospitalId,
              branchId,
              date,
              appointmentsCount: appointmentsCount.data().count,
              completedAppointmentsCount: completedAppointmentsCount.data().count,
              approvedSlotsCount: approvedSlotsCount.data().totalSlots ?? 0,
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
