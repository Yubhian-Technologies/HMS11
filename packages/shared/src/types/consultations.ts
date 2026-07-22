import type { BaseDoc, Timestamp } from "./base";

/**
 * consultations/{id}. Append-only per docs/09-firestore-design.md §9.5 —
 * a correction is a new consultation referencing the original via
 * `supersedesConsultationId`, never an edit to history.
 */
export interface Consultation extends BaseDoc {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  clinicalNotes: string;
  supersedesConsultationId: string | null;
}

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

/** prescriptions/{id}. */
export interface Prescription extends BaseDoc {
  consultationId: string;
  patientId: string;
  doctorId: string;
  items: PrescriptionItem[];
}

/**
 * labOrders/{id} — Module 10 owns the pipeline status transitions from here
 * on. `consultationId` is null for a standalone order assigned by the doctor
 * outside the consult flow (Doctor Labs module); such orders start at
 * "pendingPayment" and only enter the normal pipeline once Office marks them
 * paid (markLabOrderPaid flips "pendingPayment" -> "pending").
 */
export interface LabOrder extends BaseDoc {
  consultationId: string | null;
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
  consultationId: string;
  patientId: string;
  doctorId: string;
  bedId: string | null;
  admittedAt: Timestamp | null;
  dischargedAt: Timestamp | null;
  dischargeSummary: DischargeSummary | null;
  status: "pendingBedAssignment" | "admitted" | "discharged";
}

/** followUps/{id} — becomes a real appointment once the patient books it (FR-9.6). */
export interface FollowUp extends BaseDoc {
  patientId: string;
  doctorId: string;
  sourceConsultationId: string;
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
  consultationId: string;
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
