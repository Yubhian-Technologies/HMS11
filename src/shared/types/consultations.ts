import type { BaseDoc, Timestamp } from "./base";

/**
 * The standalone `consultations` collection is gone — a consultation's
 * diagnosis/clinical notes are now the `consultationSummary` embedded
 * directly on the triggering `appointments/{id}` document (see
 * docs/10-collections-schema.md §10.6). Every collection below that used to
 * reference `consultationId` now references `appointmentId` instead, since
 * that's the one durable id that still exists.
 */

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

/** prescriptions/{id}. */
export interface Prescription extends BaseDoc {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  items: PrescriptionItem[];
}

/**
 * labOrders/{id} — Module 10 owns the pipeline status transitions from here
 * on. `appointmentId` is set for every order, including a standalone one
 * assigned by the doctor outside the consult flow (Doctor Labs module);
 * such orders start at "pendingPayment" and only enter the normal pipeline
 * once Office marks them paid (markLabOrderPaid flips "pendingPayment" ->
 * "pending").
 */
export interface LabOrder extends BaseDoc {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  testId: string;
  testName: string;
  status:
    | "pendingPayment"
    | "pending"
    | "sampleCollected"
    | "processing"
    | "completed"
    | "verified"
    | "reportUploaded";
}

export interface DischargeSummary {
  diagnosis: string;
  treatmentGiven: string;
  conditionAtDischarge: string;
  followUpInstructions: string;
  authoredBy: string;
  authoredAt: Timestamp;
}

/**
 * admissions/{id} — Module 12 owns discharge; this module only opens one.
 * `bedId`/`admittedAt` are null while the request is still
 * "pendingBedAssignment": the doctor only flags that a patient needs a
 * room; Office (assignBedToAdmission) checks bed availability and assigns
 * the actual bed, which is what advances status to "admitted".
 */
export interface Admission extends BaseDoc {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  bedId: string | null;
  /** Assigned ward-care nurse — set by updateWardCareStatus, read by the Nurse's own-ward queue. */
  nurseId: string | null;
  /** Nurse's latest ward-care progress note (updateWardCareStatus) — not append-only history, just the current note. */
  careNotes: string | null;
  admittedAt: Timestamp | null;
  dischargedAt: Timestamp | null;
  dischargeSummary: DischargeSummary | null;
  status: "pendingBedAssignment" | "admitted" | "discharged";
}

/** followUps/{id} — becomes a real appointment once the patient books it (FR-9.6). */
export interface FollowUp extends BaseDoc {
  patientId: string;
  doctorId: string;
  sourceAppointmentId: string;
  scheduledDate: string;
  resultingAppointmentId: string | null;
}

/**
 * medicalCertificates/{id}. `fileUrl` is null in this pass — this module
 * stores the structured certificate data and renders it in the UI; PDF
 * generation is a documented future add, not built now (no PDF-generation
 * infra exists yet, matching the same pragmatic scope-trim pattern as
 * push notifications not sending real FCM yet — see docs/02-missing-
 * features.md).
 */
export interface MedicalCertificate extends BaseDoc {
  patientId: string;
  doctorId: string;
  appointmentId: string;
  reason: string;
  restFromDate: string;
  restToDate: string;
  fileUrl: string | null;
}

/** referrals/{id}. */
export interface Referral extends BaseDoc {
  patientId: string;
  fromDoctorId: string;
  toDepartmentId: string;
  toDoctorId: string | null;
  reason: string;
}
