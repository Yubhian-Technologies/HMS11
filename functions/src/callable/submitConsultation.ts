import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SubmitConsultationRequest, SubmitConsultationResponse, branchCollection, doctorPath } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

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
 * The appointment's `status` tracks the VISIT lifecycle only — it always
 * becomes "COMPLETED" here, regardless of which of the three branches
 * (Admission/Prescription/Lab) were opened, since they're non-exclusive and
 * a single field can't represent "all three at once" without one silently
 * winning over the others. Each branch's own state (admissions.status,
 * labOrders.status, prescription dispensing) is tracked independently in
 * its own collection from here on — the fine-grained lab pipeline is not
 * re-entered through a second consultation step; it's tracked on
 * `labOrders.status` (advanceLabOrderStatus/uploadLabReport).
 *
 * This is the ONLY place Admission/Prescription/Lab records originate —
 * the earlier standalone assignLabOrder/assignMedicineOrder creation
 * endpoints were retired so a doctor can't create two records for the same
 * visit through two different paths.
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
  if (appt?.status !== "CONSULTING") {
    throw new HttpsError("failed-precondition", "Start the consultation before submitting it.");
  }

  const catalogTests = input.labTestIds
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
  const customTestNames = input.customLabTests ?? [];

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
  const labOrderRefs = [...catalogTests, ...customTestNames].map(() =>
    db.collection(branchCollection(input.hospitalId, input.branchId, "labOrders")).doc(),
  );
  // Custom (non-catalog) tests use their own labOrder doc id as testId — a
  // synthetic value guaranteed not to collide with a real labTestMaster
  // entry, so generateInvoice's price lookup just finds nothing and prices
  // it at 0 instead of erroring.
  const labTests = [
    ...catalogTests,
    ...customTestNames.map((name, i) => ({ testId: labOrderRefs[catalogTests.length + i]!.id, name })),
  ];
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
      consultDraft: null,
      status: "COMPLETED",
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
      // Every lab order requires prepayment, regardless of origin — starts
      // "pendingPayment"; Office's markLabOrderPaid flips it to "pending"
      // before it enters the processing pipeline.
      tx.set(labOrderRefs[i]!, {
        ...base,
        appointmentId: input.appointmentId,
        patientId: appt.patientId,
        doctorId: caller.uid,
        testId: test.testId,
        testName: test.name,
        status: "pendingPayment",
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
      before: { status: "CONSULTING" },
      after: {
        status: "COMPLETED",
        diagnosis: input.diagnosis,
        hasPrescription: Boolean(prescriptionRef),
        labOrderCount: labOrderRefs.length,
        admitted: Boolean(admissionRef),
      },
      createdAt: now,
    });
  });

  if (labOrderRefs.length > 0) {
    await sendNotification({
      userId: appt.patientId,
      type: "labOrderPaymentPending",
      title: "Lab tests requested",
      body: `${labOrderRefs.length} test${labOrderRefs.length === 1 ? "" : "s"} requested by your doctor — payment is pending at the front office.`,
      hospitalId: input.hospitalId,
    });
  }

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
