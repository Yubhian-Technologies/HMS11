import type { BaseDoc, Timestamp } from "./base";
import type { Session } from "./scheduling";
import type { PrescriptionItem } from "./consultations";

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
 *
 * This status tracks the VISIT lifecycle only — it deliberately does NOT
 * encode which of the doctor's three consultation branches (Admission /
 * Prescription / Lab) were opened, since those are non-exclusive and a
 * single field can't represent "all three at once" without one silently
 * winning over the others. Branch state lives entirely in its own
 * collection (`admissions.status`, `prescriptions`/`labOrders.status`),
 * queried directly by `appointmentId` — never derived from this field.
 * `submitConsultation` always sets `COMPLETED` once the doctor submits,
 * regardless of which branches were opened; downstream branch pipelines
 * (bed assignment, dispensing, lab processing) continue independently.
 */
export const APPOINTMENT_STATUSES = [
  /** Created, awaiting Office approval (online bookings only — a Reception walk-in starts at BOOKED directly). */
  "PENDING",
  /** Approved (online) or staff-booked in person (walk-in); patient-visible and eligible for check-in. */
  "BOOKED",
  "CHECKED_IN",
  "VITALS_COMPLETED",
  /** Doctor has opened the chart and started the consultation (startConsultation). */
  "CONSULTING",
  /** The visit encounter is done — set unconditionally by submitConsultation; branch pipelines continue independently. */
  "COMPLETED",
  /** Missed its check-in cutoff while still BOOKED — expireStaleAppointments reclaims the held capacity into the walk-in pool. */
  "EXPIRED",
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
  checkedInBy: string; // office uid — Office validates attendance
  token: string;
}

export interface EmbeddedConsultationSummary {
  diagnosis: string;
  clinicalNotes: string;
  doctorId: string;
  completedAt: Timestamp;
}

/**
 * In-progress consult form state, autosaved by the doctor's client so a
 * refresh/crash mid-consultation doesn't lose unsubmitted work. Cleared
 * (set null) by submitConsultation on successful submit. Shape mirrors
 * SubmitConsultationRequest but every field is optional/partial since it's
 * a draft, not a validated submission.
 */
export interface ConsultDraft {
  diagnosis?: string;
  clinicalNotes?: string;
  prescription?: PrescriptionItem[];
  labTestIds?: string[];
  admissionRequested?: boolean;
  savedAt: Timestamp;
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
  consultDraft: ConsultDraft | null;
  consultationSummary: EmbeddedConsultationSummary | null;
  waitingListPosition: number | null;
}
