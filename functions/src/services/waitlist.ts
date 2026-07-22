import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

export interface WaitlistPromotion {
  appointmentId: string;
  patientId: string;
  date: string;
  startTime: string | null;
}

/**
 * FR-6.5. Called from within an existing transaction whenever a
 * slot-backed appointment frees its slot (reject/cancel/reschedule-away).
 * Promotes the earliest waiting-list entry for the same doctor+date onto
 * the freed slot instead of just reopening it, if one exists.
 *
 * Returns the promoted appointment's details (or null) so the caller can
 * notify that patient — deliberately *not* sent from in here, since this
 * runs inside a transaction callback that Firestore may retry on
 * contention, and sendNotification's side effects must only ever fire once.
 */
export async function freeSlotAndPromoteWaitlist(
  db: Firestore,
  tx: Transaction,
  params: { slotId: string; doctorId: string; date: string },
): Promise<WaitlistPromotion | null> {
  const now = FieldValue.serverTimestamp();
  const slotRef = db.collection("doctorSlots").doc(params.slotId);

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

  if (waitingListQuery.empty) {
    tx.update(slotRef, { status: "approved", updatedAt: now });
    return null;
  }

  const promoted = waitingListQuery.docs[0]!;
  const promotedData = promoted.data();
  tx.update(slotRef, { status: "booked", updatedAt: now });
  tx.update(promoted.ref, {
    slotId: params.slotId,
    status: "approved",
    waitingListPosition: null,
    updatedAt: now,
  });

  return {
    appointmentId: promoted.id,
    patientId: promotedData.patientId as string,
    date: promotedData.date as string,
    startTime: (promotedData.startTime as string | null) ?? null,
  };
}
