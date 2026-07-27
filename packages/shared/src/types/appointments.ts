import type { BaseDoc } from "./base";
import type { Session } from "./scheduling";

/**
 * appointments/{id}. `session: null` covers both emergency (FR-7, bypasses
 * slot pools entirely) and waiting-list entries (FR-6.5, `waitingListPosition`
 * set instead) — until promoted, a waiting-list entry has no session yet.
 * `bookedVia` records which doctorSlots counter bucket this booking drew
 * from (FR-4.5 add-on), so cancelling/rescheduling decrements the same one
 * it incremented. See docs/10-collections-schema.md.
 */
export interface Appointment extends BaseDoc {
  patientId: string;
  patientName: string;
  doctorId: string;
  departmentId: string;
  type: "normal" | "emergency";
  priority: number;
  date: string;
  session: Session | null;
  bookedVia: "online" | "walkin" | null;
  /** No per-slot clock time exists any more — always null; kept only so any
   * older reader that still checks this field degrades gracefully. */
  startTime: string | null;
  token: string | null;
  status: "pending" | "approved" | "rejected" | "rescheduled" | "checkedIn" | "completed" | "cancelled";
  waitingListPosition: number | null;
}
