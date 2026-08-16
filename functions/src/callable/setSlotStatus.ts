import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetSlotStatusRequest, doctorCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

const DEFAULT_CHECK_IN_CUTOFF_MINUTES = 15;

/**
 * Doctor may only decline an Office proposal it hasn't reviewed yet
 * (`rejected`, from `proposed`) — confirming/adjusting the total goes
 * through submitSlotProposal instead, never through this generic setter.
 *
 * Office publishes a doctor-reviewed proposal (`approved`, from
 * `doctorReviewed`) — this IS the capacity split: `walkInReserved` and
 * `checkInCutoffMinutes` are Office's decision, made here, never earlier and
 * never by the doctor. Office also unblocks an `approved` pool it
 * previously blocked (no split re-entry needed — values are unchanged),
 * blocks an `approved` pool, or withdraws its own `proposed`/`doctorReviewed`
 * proposal (`rejected`).
 */
export const setSlotStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor", "office"]);
  const input = SetSlotStatusRequest.parse(request.data);
  const { hospitalId, branchId, doctorId, slotId, status } = input;
  assertOwnHospital(caller, hospitalId);

  if (caller.role === "doctor" && caller.uid !== doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only act on their own slots.");
  }
  if (caller.role === "office" && caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only manage slots in your own branch.");
  }

  const slotsCollection = doctorCollection(hospitalId, branchId, doctorId, "slots");
  const db = getFirestore();
  const snap = await db.collection(slotsCollection).doc(slotId).get();
  const slot = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Slot not found.");
  }

  const data: Record<string, unknown> = { status };

  if (caller.role === "doctor") {
    if (status !== "rejected" || slot?.status !== "proposed") {
      throw new HttpsError(
        "permission-denied",
        "Doctors may only decline an unreviewed Office proposal here — use submitSlotProposal to confirm capacity.",
      );
    }
  } else {
    // office
    if (status === "approved") {
      if (slot?.status === "doctorReviewed") {
        if (input.walkInReserved === undefined) {
          throw new HttpsError(
            "invalid-argument",
            "walkInReserved is required when publishing a doctor-reviewed proposal — this is the online/walk-in split.",
          );
        }
        if (input.walkInReserved > (slot.totalCount as number)) {
          throw new HttpsError("invalid-argument", "Walk-in reservation can't exceed the confirmed total.");
        }
        data.walkInReserved = input.walkInReserved;
        data.checkInCutoffMinutes = input.checkInCutoffMinutes ?? DEFAULT_CHECK_IN_CUTOFF_MINUTES;
      } else if (slot?.status !== "blocked") {
        throw new HttpsError(
          "permission-denied",
          "Office can only publish a doctor-reviewed proposal or unblock a slot.",
        );
      }
    } else if (status === "blocked") {
      if (slot?.status !== "approved") {
        throw new HttpsError("permission-denied", "Only an approved slot can be blocked.");
      }
    } else if (status === "rejected") {
      if (slot?.status !== "proposed" && slot?.status !== "doctorReviewed") {
        throw new HttpsError("permission-denied", "Office can only withdraw a proposal (proposed or doctor-reviewed).");
      }
    }
  }

  await writeWithAudit(db, {
    collection: slotsCollection,
    docId: slotId,
    data,
    action: "statusChange",
    before: slot ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
