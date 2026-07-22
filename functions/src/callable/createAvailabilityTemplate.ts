import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AVAILABILITY_WINDOWS, CreateAvailabilityTemplateRequest, CreateAvailabilityTemplateResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";
import { toMinutes } from "../services/datetime";

function assertFitsWindow(session: "morning" | "afternoon", slotCount: number, slotDurationMinutes: number): void {
  const window = AVAILABILITY_WINDOWS[session];
  const windowMinutes = toMinutes(window.end) - toMinutes(window.start);
  if (slotCount * slotDurationMinutes > windowMinutes) {
    const maxSlots = Math.floor(windowMinutes / slotDurationMinutes);
    throw new HttpsError(
      "invalid-argument",
      `Too many ${session} slots — the ${session} window (${window.start}–${window.end}) only fits ${maxSlots} slots of ${slotDurationMinutes} minutes.`,
    );
  }
}

/** FR-4.1. admin (delegated) or doctor (own only). */
export const createAvailabilityTemplate = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "doctor"]);
  const input = CreateAvailabilityTemplateRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.role === "doctor" && caller.uid !== input.doctorId) {
    throw new HttpsError("permission-denied", "Doctors can only manage their own availability.");
  }

  assertFitsWindow("morning", input.morningSlots, input.slotDurationMinutes);
  assertFitsWindow("afternoon", input.afternoonSlots, input.slotDurationMinutes);

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const doctorSnap = await db.collection("doctorProfiles").doc(input.doctorId).get();
  if (!doctorSnap.exists || doctorSnap.data()?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Doctor not found in this hospital.");
  }

  const templateId = await writeWithAudit(db, {
    collection: "doctorAvailabilityTemplates",
    data: {
      doctorId: input.doctorId,
      weekday: input.weekday,
      morningSlots: input.morningSlots,
      afternoonSlots: input.afternoonSlots,
      slotDurationMinutes: input.slotDurationMinutes,
      breaks: input.breaks,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateAvailabilityTemplateResponse.parse({ templateId });
});
