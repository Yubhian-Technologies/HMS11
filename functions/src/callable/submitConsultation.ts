import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SubmitConsultationRequest, SubmitConsultationResponse, branchCollection, doctorPath } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * doctor only, own appointment. Every decision a doctor makes from the
 * consultation screen — diagnosis/notes, prescription, lab orders,
 * admission, follow-up, certificate, referral — commits as one transaction
 * (multi-document writes within one business action must not partially
 * succeed). Unlike the earlier design, there is no separate `consultations`
 * document: diagnosis/clinicalNotes become the embedded
 * `consultationSummary` on the appointment itself
 * (docs/10-collections-schema.md §10.6) — this is an in-place field, not an
 * append-only history chain, a deliberate trade-off accepted for the
 * real-time single-document benefits (see that doc section).
 *
 * Scope note: this pass sets the appointment's coarse status
 * (LAB_REQUESTED / PRESCRIPTION_READY / COMPLETED) but does not implement a
 * "doctor resumes after lab report" second consultation step — the fine-
 * grained lab pipeline continues to be tracked independently on
 * `labOrders.status` (advanceLabOrderStatus/uploadLabReport), same as
 * before this migration. See CLAUDE.md changelog.
 */
export const submitConsultation = onCall(async (request) => {
  const caller = requireCallerRole(request, ["doctor"]);
  const input = SubmitConsultationRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only submit consultations in your own branch.");
  }

  const db = getFirestore();
  const appointmentsCollection = branchCollection(input.hospitalId, input.branchId, "appointments");
  const apptRef = db.collection(appointmentsCollection).doc(input.appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.doctorId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only consult on your own appointments.");
  }
  if (appt?.status !== "VITALS_COMPLETED") {
    throw new HttpsError("failed-precondition", "Vitals must be recorded before consultation.");
  }

  const labTests = input.labTestIds
    ? await Promise.all(
        input.labTestIds.map(async (testId) => {
          const snap = await db
            .collection(branchCollection(input.hospitalId, input.branchId, "labTestMaster"))
            .doc(testId)
            .get();
          if (!snap.exists) {
            throw new HttpsError("not-found", `Lab test ${testId} not found.`);
          }
          return { testId, name: snap.data()?.name as string };
        }),
      )
    : [];

  if (input.referral?.toDoctorId) {
    const referredDoctorSnap = await db
      .doc(doctorPath(input.hospitalId, input.branchId, input.referral.toDoctorId))
      .get();
    if (!referredDoctorSnap.exists) {
      throw new HttpsError("not-found", "Referred doctor not found.");
    }
  }

  const prescriptionRef = input.prescription?.length
    ? db.collection(branchCollection(input.hospitalId, input.branchId, "prescriptions")).doc()
    : null;
  const labOrderRefs = labTests.map(() =>
    db.collection(branchCollection(input.hospitalId, input.branchId, "labOrders")).doc(),
  );
  const admissionRef = input.admissionRequested
    ? db.collection(branchCollection(input.hospitalId, input.branchId, "admissions")).doc()
    : null;
  const followUpRef = input.followUp
    ? db.collection(branchCollection(input.hospitalId, input.branchId, "followUps")).doc()
    : null;
  const certificateRef = input.certificate
    ? db.collection(branchCollection(input.hospitalId, input.branchId, "medicalCertificates")).doc()
    : null;
  const referralRef = input.referral
    ? db.collection(branchCollection(input.hospitalId, input.branchId, "referrals")).doc()
    : null;

  const finalStatus = labTests.length > 0 ? "LAB_REQUESTED" : input.admissionRequested ? "PRESCRIPTION_READY" : "COMPLETED";

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

    tx.update(apptRef, {
      consultationSummary: {
        diagnosis: input.diagnosis,
        clinicalNotes: input.clinicalNotes,
        doctorId: caller.uid,
        completedAt: now,
      },
      status: finalStatus,
      updatedAt: now,
    });

    if (prescriptionRef && input.prescription) {
      tx.set(prescriptionRef, {
        ...base,
        appointmentId: input.appointmentId,
        patientId: appt.patientId,
        doctorId: caller.uid,
        items: input.prescription,
        dispenseStatus: "pending",
      });
    }

    labTests.forEach((test, i) => {
      tx.set(labOrderRefs[i]!, {
        ...base,
        appointmentId: input.appointmentId,
        patientId: appt.patientId,
        doctorId: caller.uid,
        testId: test.testId,
        testName: test.name,
        status: "pending",
      });
    });

    if (admissionRef && input.admissionRequested) {
      tx.set(admissionRef, {
        ...base,
        appointmentId: input.appointmentId,
        patientId: appt.patientId,
        doctorId: caller.uid,
        bedId: null,
        nurseId: null,
        admittedAt: null,
        dischargedAt: null,
        dischargeSummary: null,
        status: "pendingBedAssignment",
      });
    }

    if (followUpRef && input.followUp) {
      tx.set(followUpRef, {
        ...base,
        patientId: appt.patientId,
        doctorId: caller.uid,
        sourceAppointmentId: input.appointmentId,
        scheduledDate: input.followUp.scheduledDate,
        resultingAppointmentId: null,
      });
    }

    if (certificateRef && input.certificate) {
      tx.set(certificateRef, {
        ...base,
        patientId: appt.patientId,
        doctorId: caller.uid,
        appointmentId: input.appointmentId,
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

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "update",
      entityType: "appointments",
      entityId: input.appointmentId,
      before: { status: "VITALS_COMPLETED" },
      after: {
        status: finalStatus,
        diagnosis: input.diagnosis,
        hasPrescription: Boolean(prescriptionRef),
        labOrderCount: labOrderRefs.length,
        admitted: Boolean(admissionRef),
      },
      createdAt: now,
    });
  });

  return SubmitConsultationResponse.parse({
    appointmentId: input.appointmentId,
    prescriptionId: prescriptionRef?.id ?? null,
    labOrderIds: labOrderRefs.map((r) => r.id),
    admissionId: admissionRef?.id ?? null,
    followUpId: followUpRef?.id ?? null,
    certificateId: certificateRef?.id ?? null,
    referralId: referralRef?.id ?? null,
  });
});
