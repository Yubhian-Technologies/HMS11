import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RecordVitalsRequest, RecordVitalsResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Nurse only, own branch (moved off Reception — docs/07-user-roles.md,
 * docs/08-permission-matrix.md "Vitals" row). BMI is always computed here
 * from weight/height, never accepted from the client. Writes directly onto
 * `appointments/{id}.vitals` (embedded — docs/10-collections-schema.md §10.6)
 * instead of a standalone `vitals` document; "Send to Doctor" is this same
 * call, not a separate step — the doctor's own real-time listener on this
 * same appointment document sees the new vitals + status the instant this
 * commits (no separate "push to doctor" step).
 */
export const recordVitals = onCall(async (request) => {
  const caller = requireCallerRole(request, ["nurse"]);
  const input = RecordVitalsRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only record vitals in your own branch.");
  }

  const db = getFirestore();
  const apptRef = db
    .collection(branchCollection(input.hospitalId, input.branchId, "appointments"))
    .doc(input.appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.status !== "CHECKED_IN") {
    throw new HttpsError("failed-precondition", "The patient must be checked in first.");
  }

  const heightM = input.heightCm / 100;
  const bmi = Math.round((input.weightKg / (heightM * heightM)) * 10) / 10;
  const now = FieldValue.serverTimestamp();

  await apptRef.update({
    vitals: {
      bloodPressure: input.bloodPressure,
      pulse: input.pulse,
      temperatureC: input.temperatureC,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      bmi,
      spo2: input.spo2,
      sugarMgDl: input.sugarMgDl ?? null,
      respiratoryRate: input.respiratoryRate ?? null,
      chiefComplaint: input.chiefComplaint,
      notes: input.notes,
      recordedBy: caller.uid,
      recordedAt: now,
      sentToDoctorAt: now,
    },
    status: "VITALS_COMPLETED",
    updatedAt: now,
  });

  const auditRef = db.collection("auditLogs").doc();
  await auditRef.set({
    hospitalId: input.hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "update",
    entityType: "appointments",
    entityId: input.appointmentId,
    before: { status: "CHECKED_IN" },
    after: { status: "VITALS_COMPLETED" },
    createdAt: now,
  });

  return RecordVitalsResponse.parse({ appointmentId: input.appointmentId, status: "VITALS_COMPLETED" });
});
