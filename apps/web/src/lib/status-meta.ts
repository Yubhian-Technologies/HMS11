/**
 * Per-domain status -> {label, tone} maps, feeding the shared <StatusBadge>.
 * `tone` is a small fixed vocabulary (not a Badge variant directly) so every
 * domain's status set can share one visual language: neutral = inert/no
 * action needed, info = active/in-progress, warning = waiting on someone,
 * success = finished cleanly, danger = rejected/expired/failed — reserved
 * for genuine problems, not routine "still pending" states.
 */
export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export interface StatusMetaEntry {
  label: string;
  tone: StatusTone;
}

/** Appointment.status (packages/shared/src/types/appointments.ts). */
export const APPOINTMENT_STATUS_META: Record<string, StatusMetaEntry> = {
  PENDING: { label: "Pending Approval", tone: "warning" },
  BOOKED: { label: "Booked", tone: "info" },
  CHECKED_IN: { label: "Checked In", tone: "info" },
  VITALS_COMPLETED: { label: "Vitals Recorded", tone: "info" },
  CONSULTING: { label: "In Consultation", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  EXPIRED: { label: "Expired", tone: "danger" },
  REJECTED: { label: "Rejected", tone: "danger" },
  RESCHEDULED: { label: "Rescheduled", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

/** DoctorSlot.status (packages/shared/src/types/scheduling.ts) — Office-facing copy. */
export const SLOT_STATUS_META_OFFICE: Record<string, StatusMetaEntry> = {
  proposed: { label: "Proposed", tone: "neutral" },
  doctorReviewed: { label: "Awaiting Your Split & Release", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  blocked: { label: "Blocked", tone: "danger" },
};

/** DoctorSlot.status — Doctor-facing copy (same states, different wording). */
export const SLOT_STATUS_META_DOCTOR: Record<string, StatusMetaEntry> = {
  proposed: { label: "Proposed by Office", tone: "warning" },
  doctorReviewed: { label: "Sent to Office", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  blocked: { label: "Blocked", tone: "danger" },
};

/** Admission.status (packages/shared/src/types/consultations.ts). */
export const ADMISSION_STATUS_META: Record<string, StatusMetaEntry> = {
  pendingBedAssignment: { label: "Awaiting Bed", tone: "warning" },
  admitted: { label: "Admitted", tone: "info" },
  discharged: { label: "Discharged", tone: "success" },
};

/** LabOrder.status (packages/shared/src/types/consultations.ts). */
export const LAB_ORDER_STATUS_META: Record<string, StatusMetaEntry> = {
  pendingPayment: { label: "Awaiting Payment", tone: "warning" },
  pending: { label: "Pending", tone: "neutral" },
  sampleCollected: { label: "Sample Collected", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "info" },
  verified: { label: "Verified", tone: "info" },
  reportUploaded: { label: "Report Ready", tone: "success" },
};

/** Bed.status (packages/shared/src/types/facilities.ts). */
export const BED_STATUS_META: Record<string, StatusMetaEntry> = {
  available: { label: "Available", tone: "success" },
  occupied: { label: "Occupied", tone: "info" },
  reserved: { label: "Reserved", tone: "warning" },
  cleaning: { label: "Cleaning", tone: "neutral" },
  maintenance: { label: "Maintenance", tone: "danger" },
};

/** The common `status: "active" | "disabled"` pattern shared by most catalog entities. */
export const ACTIVE_DISABLED_STATUS_META: Record<string, StatusMetaEntry> = {
  active: { label: "Active", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
};

/** Whether a prescription item has a matching medicineDispenses record. */
export const DISPENSE_STATUS_META: Record<"dispensed" | "pending", StatusMetaEntry> = {
  dispensed: { label: "Dispensed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
};

/** Feedback.status (packages/shared/src/types/feedback.ts) — open/resolved. */
export const FEEDBACK_STATUS_META: Record<string, StatusMetaEntry> = {
  open: { label: "Open", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
};

/** Invoice/payment status. */
export const INVOICE_STATUS_META: Record<string, StatusMetaEntry> = {
  unpaid: { label: "Unpaid", tone: "warning" },
  partiallyPaid: { label: "Partially Paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
};

/** Fallback for any status string with no domain-specific entry — still readable, just neutral. */
export function fallbackStatusMeta(status: string): StatusMetaEntry {
  return { label: status, tone: "neutral" };
}
