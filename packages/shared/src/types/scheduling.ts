import type { BaseDoc, Weekday } from "./base";

export interface AvailabilityBreak {
  start: string;
  end: string;
}

/**
 * Fixed session windows a doctor's count-based template generates into —
 * "N morning slots / M afternoon slots" rather than a doctor-picked
 * start/end time range. Shared between the createAvailabilityTemplate
 * validation (window-fit check) and generateRollingSlots (actual
 * generation), so both always agree on what "morning"/"afternoon" means.
 */
export const AVAILABILITY_WINDOWS = {
  morning: { start: "09:00", end: "13:00" },
  afternoon: { start: "14:00", end: "18:00" },
} as const;

/**
 * doctorAvailabilityTemplates/{id}. See docs/10-collections-schema.md.
 * Availability is defined by count, not by picking exact clock times — the
 * doctor says how many slots they're available for in each fixed session
 * (AVAILABILITY_WINDOWS); generateRollingSlots turns that into the actual
 * evenly-spaced bookable doctorSlots/{id} documents (which keep their own
 * real startTime/endTime — only how the doctor DEFINES availability changed).
 */
export interface DoctorAvailabilityTemplate extends BaseDoc {
  doctorId: string;
  weekday: Weekday;
  morningSlots: number;
  afternoonSlots: number;
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
