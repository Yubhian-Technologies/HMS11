import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";

/**
 * FR-6.5. Called from within an existing transaction whenever a
 * slot-backed appointment frees its slot (reject/cancel/reschedule-away).
 * Promotes the earliest waiting-list entry for the same doctor+date onto
 * the freed slot instead of just reopening it, if one exists.
 */
export async function freeSlotAndPromoteWaitlist(
  db: Firestore,
  tx: Transaction,
  params: { slotId: string; doctorId: string; date: string },
): Promise<void> {
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
    return;
  }

  const promoted = waitingListQuery.docs[0]!;
  tx.update(slotRef, { status: "booked", updatedAt: now });
  tx.update(promoted.ref, {
    slotId: params.slotId,
    status: "approved",
    waitingListPosition: null,
    updatedAt: now,
  });
}
