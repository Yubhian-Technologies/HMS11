import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { StartConsultationRequest, StartConsultationResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Doctor only, own appointment. VITALS_COMPLETED -> CONSULTING when the
 * doctor opens the chart — makes "this patient is being seen right now"
 * distinguishable from "next in queue," so two staff/tabs can't both treat
 * the same VITALS_COMPLETED patient as unclaimed. submitConsultation
 * requires CONSULTING, not VITALS_COMPLETED, so a consult can't be
 * submitted without this step having run first.
 */
export const startConsultation = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = StartConsultationRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only start consultations in your own branch.");
  }

  const db = getFirestore();
  const apptRef = db.collection(branchCollection(input.hospitalId, input.branchId, "appointments")).doc(input.appointmentId);

  await db.runTransaction(async (tx) => {
    const apptSnap = await tx.get(apptRef);
    const appt = apptSnap.data();
    if (!apptSnap.exists) {
      throw new HttpsError("not-found", "Appointment not found.");
    }
    if (appt?.doctorId !== caller.uid) {
      throw new HttpsError("permission-denied", "You can only consult on your own appointments.");
    }
    if (appt?.status !== "VITALS_COMPLETED") {
      throw new HttpsError("failed-precondition", "Vitals must be recorded before starting the consultation.");
    }

    const now = FieldValue.serverTimestamp();
    tx.update(apptRef, { status: "CONSULTING", updatedAt: now });
  });

  return StartConsultationResponse.parse({ success: true });
});
