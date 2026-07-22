import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateManualSlotRequest, CreateManualSlotResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-4.5. office only, own branch. Manually-added slots go straight to
 * "approved" — Office is acting on the doctor's behalf (e.g. an extra
 * covering shift confirmed out of band), so a second approval step would
 * just be friction. `generatedByTemplateId: null` marks it as a one-off.
 */
export const createManualSlot = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const input = CreateManualSlotRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only add slots in your own branch.");
  }

  const db = getFirestore();
  const doctorSnap = await db.collection("doctorProfiles").doc(input.doctorId).get();
  if (
    !doctorSnap.exists ||
    doctorSnap.data()?.hospitalId !== input.hospitalId ||
    doctorSnap.data()?.branchId !== input.branchId
  ) {
    throw new HttpsError("not-found", "Doctor not found in this branch.");
  }

  const slotId = await writeWithAudit(db, {
    collection: "doctorSlots",
    data: {
      doctorId: input.doctorId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "approved",
      generatedByTemplateId: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateManualSlotResponse.parse({ slotId });
});
