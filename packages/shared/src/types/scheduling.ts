import type { BaseDoc, Weekday } from "./base";

export interface AvailabilityBreak {
  start: string;
  end: string;
}

/** doctorAvailabilityTemplates/{id}. See docs/10-collections-schema.md. */
export interface DoctorAvailabilityTemplate extends BaseDoc {
  doctorId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  breaks: AvailabilityBreak[];
  status: "active" | "disabled";
}

/**
 * doctorSlots/{id}. `generatedByTemplateId` is null for Office-created
 * one-off slots (FR-4.5) — see docs/10-collections-schema.md.
 */
export interface DoctorSlot extends BaseDoc {
  doctorId: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  status: "pendingApproval" | "approved" | "rejected" | "booked" | "blocked" | "completed";
  generatedByTemplateId: string | null;
}
