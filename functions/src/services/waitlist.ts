import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { Session } from "@hms/shared";

export interface WaitlistPromotion {
  appointmentId: string;
  patientId: string;
  date: string;
  session: Session;
}

/**
 * FR-6.5. Called from within an existing transaction whenever a
 * session-backed appointment frees its seat (reject/cancel/reschedule-away).
 * Promotes the earliest waiting-list entry for the same doctor+date onto the
 * freed seat instead of just opening it back up, if one exists — the
 * promoted appointment takes over the exact bucket (`bookedVia`) the freed
 * one held, so the pool doc's counters never actually change on a
 * promotion (one booking's seat becomes another's, net zero). Only when
 * there's no one to promote does this decrement the pool's counter to
 * actually free capacity.
 *
 * Returns the promoted appointment's details (or null) so the caller can
 * notify that patient — deliberately *not* sent from in here, since this
 * runs inside a transaction callback that Firestore may retry on
 * contention, and sendNotification's side effects must only ever fire once.
 */
export async function freeSlotAndPromoteWaitlist(
  db: Firestore,
  tx: Transaction,
  params: { doctorId: string; date: string; session: Session; bookedVia: "online" | "walkin" },
): Promise<WaitlistPromotion | null> {
  const now = FieldValue.serverTimestamp();
  const poolRef = db.collection("doctorSlots").doc(`${params.doctorId}_${params.date}_${params.session}`);

  const waitingListQuery = await tx.get(
    db
      .collection("appointments")
      .where("doctorId", "==", params.doctorId)
      .where("date", "==", params.date)
      .where("status", "==", "pending")
      .where("waitingListPosition", ">", 0)
      .orderBy("waitingListPosition", "asc")
      .limit(1),
  );

  const bucketField = params.bookedVia === "online" ? "onlineBookedCount" : "walkInBookedCount";

  if (waitingListQuery.empty) {
    tx.update(poolRef, { [bucketField]: FieldValue.increment(-1), updatedAt: now });
    return null;
  }

  const promoted = waitingListQuery.docs[0]!;
  const promotedData = promoted.data();
  tx.update(promoted.ref, {
    date: params.date,
    session: params.session,
    bookedVia: params.bookedVia,
    status: "approved",
    waitingListPosition: null,
    updatedAt: now,
  });

  return {
    appointmentId: promoted.id,
    patientId: promotedData.patientId as string,
    date: params.date,
    session: params.session,
  };
}
