import type { BaseDoc, Timestamp } from "./base";
import type { Session } from "./scheduling";

/**
 * hospitals/{hospitalId}/branches/{branchId}/appointments/{id}. The center of
 * the system — check-in, vitals, and the consultation summary are embedded
 * directly here rather than in separate collections, so the doctor's live
 * queue listener and the nurse's "send to doctor" hand-off are a single
 * document write/read, never a join. See docs/10-collections-schema.md §10.6
 * for the full rationale and the trade-off this accepts (an embedded
 * `consultationSummary` is edited in place, not append-only across
 * corrections, unlike the standalone `consultations` collection this
 * replaces).
 *
 * `session: null` covers both emergency (bypasses slot pools entirely) and
 * waiting-list entries (`waitingListPosition` set instead) — until promoted,
 * a waiting-list entry has no session yet. `bookedVia` records which
 * doctorSlots counter bucket this booking drew from, so cancelling/
 * rescheduling decrements the same one it incremented.
 */
export const APPOINTMENT_STATUSES = [
  /** Created, awaiting Office approval — the pre-existing approval gate (FR-6.3), unchanged by this schema revision. */
  "PENDING",
  /** Office-approved; patient-visible and eligible for check-in. */
  "BOOKED",
  "CHECKED_IN",
  "VITALS_COMPLETED",
  "CONSULTING",
  "LAB_REQUESTED",
  "PAYMENT_PENDING",
  "LAB_IN_PROGRESS",
  "REPORT_UPLOADED",
  "PRESCRIPTION_READY",
  "ADMITTED",
  "DISCHARGED",
  "COMPLETED",
  "REJECTED",
  "RESCHEDULED",
  "CANCELLED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface EmbeddedVitals {
  bloodPressure: string;
  pulse: number;
  temperatureC: number;
  weightKg: number;
  heightCm: number;
  bmi: number; // computed server-side at write time, never trusted from the client
  spo2: number;
  sugarMgDl: number | null;
  respiratoryRate: number | null;
  chiefComplaint: string;
  notes: string;
  recordedBy: string; // nurse uid
  recordedAt: Timestamp;
  sentToDoctorAt: Timestamp;
}

export interface EmbeddedCheckIn {
  checkedInAt: Timestamp;
  checkedInBy: string; // reception uid
  token: string;
}

export interface EmbeddedConsultationSummary {
  diagnosis: string;
  clinicalNotes: string;
  doctorId: string;
  completedAt: Timestamp;
}

export interface Appointment extends BaseDoc {
  patientId: string;
  patientName: string; // denormalized for list/queue views
  doctorId: string;
  departmentId: string;
  type: "normal" | "emergency";
  priority: number; // emergency queue ordering; 0 for normal
  date: string; // ISO date
  session: Session | null;
  bookedVia: "online" | "walkin" | null;
  status: AppointmentStatus;
  checkIn: EmbeddedCheckIn | null;
  vitals: EmbeddedVitals | null;
  consultationSummary: EmbeddedConsultationSummary | null;
  waitingListPosition: number | null;
}
