import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SubmitSlotProposalRequest, SubmitSlotProposalResponse, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

/**
 * Doctor confirms an Office-created proposal, optionally adjusting the total
 * capacity. Sets `status` to `doctorReviewed` and notifies the Office that
 * proposed it. The doctor never sets the online/walk-in split or the
 * no-show cutoff — those are Office's decision at publish time
 * (setSlotStatus → `approved`).
 */
export const submitSlotProposal = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = SubmitSlotProposalRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.uid !== input.doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only respond to their own slot proposals.");
  }

  const db = getFirestore();
  const slotsCollection = doctorCollection(input.hospitalId, caller.branchId!, input.doctorId, "slots");
  const snap = await db.collection(slotsCollection).doc(input.slotId).get();
  const slot = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Slot not found.");
  }
  if (slot?.status !== "proposed") {
    throw new HttpsError("failed-precondition", "Only a proposed slot can be submitted for review.");
  }

  const now = FieldValue.serverTimestamp();
  await writeWithAudit(db, {
    collection: slotsCollection,
    docId: input.slotId,
    data: {
      totalCount: input.totalCount,
      status: "doctorReviewed",
      updatedAt: now,
    },
    action: "update",
    before: slot,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  if (slot.createdBy) {
    await sendNotification({
      userId: slot.createdBy as string,
      type: "slotProposal",
      title: "Doctor confirmed a slot proposal",
      body: `The slot proposal for ${slot.date} (${slot.session}) was confirmed at ${input.totalCount} and sent back for your split & release.`,
      hospitalId: input.hospitalId,
      relatedEntityId: input.slotId,
    });
  }

  return SubmitSlotProposalResponse.parse({ success: true });
});
