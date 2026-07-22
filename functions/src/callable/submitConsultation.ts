import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SubmitConsultationRequest, SubmitConsultationResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-9.2–9.8. doctor only, own appointment. Every decision a doctor makes
 * from the consultation screen — diagnosis/notes, prescription, lab
 * orders, admission, follow-up, certificate, referral — commits as one
 * transaction (docs/13-cloud-functions.md §13.4: multi-document writes
 * within one business action must not partially succeed). Completing a
 * consultation also marks the appointment "completed".
 */
export const submitConsultation = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = SubmitConsultationRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only submit consultations in your own branch.");
  }

  const db = getFirestore();

  const apptSnap = await db.collection("appointments").doc(input.appointmentId).get();
  const appt = apptSnap.data();
  if (!apptSnap.exists || appt?.hospitalId !== input.hospitalId || appt?.branchId !== input.branchId) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.doctorId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only consult on your own appointments.");
  }
  if (appt?.status !== "checkedIn") {
    throw new HttpsError("failed-precondition", "The patient must be checked in first.");
  }

  // Reads that inform the writes below — all resolved before the
  // transaction opens, per the read-before-write rule for Firestore
  // transactions and to keep the transaction itself write-only and fast.
  let bedSnap = null;
  if (input.admission) {
    bedSnap = await db.collection("beds").doc(input.admission.bedId).get();
    if (!bedSnap.exists || bedSnap.data()?.hospitalId !== input.hospitalId) {
      throw new HttpsError("not-found", "Bed not found.");
    }
    if (bedSnap.data()?.status !== "available") {
      throw new HttpsError("failed-precondition", "This bed is not available.");
    }
  }

  const labTests = input.labTestIds
    ? await Promise.all(
        input.labTestIds.map(async (testId) => {
          const snap = await db.collection("labTestMaster").doc(testId).get();
          if (!snap.exists || snap.data()?.hospitalId !== input.hospitalId) {
            throw new HttpsError("not-found", `Lab test ${testId} not found.`);
          }
          return { testId, name: snap.data()?.name as string };
        }),
      )
    : [];

  if (input.referral?.toDoctorId) {
    const referredDoctorSnap = await db.collection("doctorProfiles").doc(input.referral.toDoctorId).get();
    if (!referredDoctorSnap.exists || referredDoctorSnap.data()?.hospitalId !== input.hospitalId) {
      throw new HttpsError("not-found", "Referred doctor not found.");
    }
  }

  const consultationRef = db.collection("consultations").doc();
  const prescriptionRef = input.prescription?.length ? db.collection("prescriptions").doc() : null;
  const labOrderRefs = labTests.map(() => db.collection("labOrders").doc());
  const admissionRef = input.admission ? db.collection("admissions").doc() : null;
  const followUpRef = input.followUp ? db.collection("followUps").doc() : null;
  const certificateRef = input.certificate ? db.collection("medicalCertificates").doc() : null;
  const referralRef = input.referral ? db.collection("referrals").doc() : null;

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();
    const base = {
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    tx.set(consultationRef, {
      ...base,
      appointmentId: input.appointmentId,
      patientId: appt.patientId,
      doctorId: caller.uid,
      diagnosis: input.diagnosis,
      clinicalNotes: input.clinicalNotes,
      supersedesConsultationId: null,
    });

    if (prescriptionRef && input.prescription) {
      tx.set(prescriptionRef, {
        ...base,
        consultationId: consultationRef.id,
        patientId: appt.patientId,
        doctorId: caller.uid,
        items: input.prescription,
      });
    }

    labTests.forEach((test, i) => {
      tx.set(labOrderRefs[i]!, {
        ...base,
        consultationId: consultationRef.id,
        patientId: appt.patientId,
        doctorId: caller.uid,
        testId: test.testId,
        testName: test.name,
        status: "pending",
      });
    });

    if (admissionRef && input.admission) {
      tx.set(admissionRef, {
        ...base,
        consultationId: consultationRef.id,
        patientId: appt.patientId,
        doctorId: caller.uid,
        bedId: input.admission.bedId,
        admittedAt: now,
        dischargedAt: null,
        dischargeSummary: null,
        status: "admitted",
      });
      tx.update(db.collection("beds").doc(input.admission.bedId), { status: "occupied", updatedAt: now });
    }

    if (followUpRef && input.followUp) {
      tx.set(followUpRef, {
        ...base,
        patientId: appt.patientId,
        doctorId: caller.uid,
        sourceConsultationId: consultationRef.id,
        scheduledDate: input.followUp.scheduledDate,
        resultingAppointmentId: null,
      });
    }

    if (certificateRef && input.certificate) {
      tx.set(certificateRef, {
        ...base,
        patientId: appt.patientId,
        doctorId: caller.uid,
        consultationId: consultationRef.id,
        reason: input.certificate.reason,
        restFromDate: input.certificate.restFromDate,
        restToDate: input.certificate.restToDate,
        fileUrl: null,
      });
    }

    if (referralRef && input.referral) {
      tx.set(referralRef, {
        ...base,
        patientId: appt.patientId,
        fromDoctorId: caller.uid,
        toDepartmentId: input.referral.toDepartmentId,
        toDoctorId: input.referral.toDoctorId ?? null,
        reason: input.referral.reason,
      });
    }

    tx.update(db.collection("appointments").doc(input.appointmentId), {
      status: "completed",
      updatedAt: now,
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "consultations",
      entityId: consultationRef.id,
      before: null,
      after: {
        diagnosis: input.diagnosis,
        hasPrescription: Boolean(prescriptionRef),
        labOrderCount: labOrderRefs.length,
        admitted: Boolean(admissionRef),
      },
      createdAt: now,
    });
  });

  return SubmitConsultationResponse.parse({
    consultationId: consultationRef.id,
    prescriptionId: prescriptionRef?.id ?? null,
    labOrderIds: labOrderRefs.map((r) => r.id),
    admissionId: admissionRef?.id ?? null,
    followUpId: followUpRef?.id ?? null,
    certificateId: certificateRef?.id ?? null,
    referralId: referralRef?.id ?? null,
  });
});
