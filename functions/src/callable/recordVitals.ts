import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { RecordVitalsRequest, RecordVitalsResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-8.2. reception only, own branch. BMI is always computed here from
 * weight/height, never accepted from the client, and immediately visible
 * to the doctor via their own real-time listener on this collection
 * (FR-8.3 — no separate "push to doctor" step, it's the same document).
 */
export const recordVitals = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception"]);
  const input = RecordVitalsRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only record vitals in your own branch.");
  }

  const db = getFirestore();
  const apptSnap = await db.collection("appointments").doc(input.appointmentId).get();
  const appt = apptSnap.data();
  if (!apptSnap.exists || appt?.hospitalId !== input.hospitalId || appt?.branchId !== input.branchId) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.status !== "checkedIn") {
    throw new HttpsError("failed-precondition", "The patient must be checked in first.");
  }

  const heightM = input.heightCm / 100;
  const bmi = Math.round((input.weightKg / (heightM * heightM)) * 10) / 10;

  const vitalsId = await writeWithAudit(db, {
    collection: "vitals",
    data: {
      appointmentId: input.appointmentId,
      patientId: appt.patientId,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      bmi,
      bloodPressure: input.bloodPressure,
      pulse: input.pulse,
      sugarMgDl: input.sugarMgDl,
      temperatureC: input.temperatureC,
      spo2: input.spo2,
      chiefComplaint: input.chiefComplaint,
      notes: input.notes,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return RecordVitalsResponse.parse({ vitalsId });
});
