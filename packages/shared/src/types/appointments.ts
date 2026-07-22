import type { BaseDoc } from "./base";

/**
 * appointments/{id}. `slotId: null` covers both emergency (FR-7, bypasses
 * slots entirely) and waiting-list entries (FR-6.5, `waitingListPosition`
 * set instead). See docs/10-collections-schema.md.
 */
export interface Appointment extends BaseDoc {
  patientId: string;
  patientName: string;
  doctorId: string;
  slotId: string | null;
  departmentId: string;
  type: "normal" | "emergency";
  priority: number;
  date: string;
  /** Null only for a waiting-list entry (FR-6.5) with no slot assigned yet. */
  startTime: string | null;
  token: string | null;
  status: "pending" | "approved" | "rejected" | "rescheduled" | "checkedIn" | "completed" | "cancelled";
  waitingListPosition: number | null;
}
