import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { doctorCollection, AVAILABILITY_WINDOWS, type Session } from "@hms/shared";
import { todayIso } from "../services/datetime";

/**
 * Phase C step 3. Runs every 5 minutes. Finds today's still-`BOOKED` (never
 * checked in) appointments whose session start + the owning pool's
 * `checkInCutoffMinutes` (Office's decision, set at slot-publish time) has
 * passed, flips them to `EXPIRED`, and reclaims the held unit into the
 * Walk-in Pool — decrements the bucket it was holding and moves that unit
 * into `walkInReserved`, so it's now available for a walk-in specifically,
 * matching the product rule literally ("capacity may then be reclaimed
 * into Walk-in Pool"), not just refunded back to general availability.
 *
 * Collection-group scan (`appointments` is nested per branch) so every
 * hospital/branch is covered in one run, backed by the existing
 * `(date, status)` COLLECTION_GROUP index in firestore.indexes.json.
 */
export const expireStaleAppointments = onSchedule("every 5 minutes", async () => {
  const db = getFirestore();
  const today = todayIso();
  const now = new Date();

  const snap = await db
    .collectionGroup("appointments")
    .where("date", "==", today)
    .where("status", "==", "BOOKED")
    .get();

  for (const apptDoc of snap.docs) {
    const appt = apptDoc.data();
    // Emergency and still-waiting-list entries have no session pool to reclaim.
    if (!appt.session || !appt.bookedVia) continue;

    const window = AVAILABILITY_WINDOWS[appt.session as Session];
    const [hh, mm] = window.start.split(":").map(Number) as [number, number];
    const sessionStart = new Date(`${appt.date}T00:00:00Z`);
    sessionStart.setUTCHours(hh, mm, 0, 0);

    const poolRef = db
      .collection(doctorCollection(appt.hospitalId, appt.branchId, appt.doctorId, "slots"))
      .doc(`${appt.date}_${appt.session}`);
    const poolSnap = await poolRef.get();
    if (!poolSnap.exists) continue;
    const pool = poolSnap.data()!;
    const cutoffMinutes = (pool.checkInCutoffMinutes as number) ?? 15;
    const cutoff = new Date(sessionStart.getTime() + cutoffMinutes * 60_000);
    if (now < cutoff) continue;

    const bucketField = appt.bookedVia === "online" ? "onlineBookedCount" : "walkInBookedCount";

    await db.runTransaction(async (tx) => {
      const freshApptSnap = await tx.get(apptDoc.ref);
      // Re-check inside the transaction — the patient may have checked in,
      // or the appointment may have been cancelled, since the scan above.
      if (freshApptSnap.data()?.status !== "BOOKED") return;

      const nowTs = FieldValue.serverTimestamp();
      tx.update(apptDoc.ref, { status: "EXPIRED", updatedAt: nowTs });
      tx.update(poolRef, {
        [bucketField]: FieldValue.increment(-1),
        walkInReserved: FieldValue.increment(1),
        updatedAt: nowTs,
      });

      const auditRef = db.collection("auditLogs").doc();
      tx.set(auditRef, {
        hospitalId: appt.hospitalId,
        actorId: "system",
        actorRole: "system",
        action: "statusChange",
        entityType: "appointments",
        entityId: apptDoc.id,
        before: { status: "BOOKED" },
        after: { status: "EXPIRED", reclaimedInto: "walkInReserved" },
        createdAt: nowTs,
      });
    });
  }
});
