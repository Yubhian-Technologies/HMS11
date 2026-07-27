import type { BaseDoc, Weekday } from "./base";

export type Session = "morning" | "afternoon";

/**
 * Display-only session windows — a doctor's availability is a count, not a
 * picked start/end time range, and generated doctorSlots pool docs carry no
 * clock time either (a consultation's actual duration can't be predicted,
 * so nothing pretends to). This is purely a UI label (e.g. "Morning ·
 * 09:00–13:00") for the two fixed sessions a day is split into.
 */
export const AVAILABILITY_WINDOWS = {
  morning: { start: "09:00", end: "13:00" },
  afternoon: { start: "14:00", end: "18:00" },
} as const;

/**
 * doctorAvailabilityTemplates/{id}. See docs/10-collections-schema.md.
 * Availability is defined by count per session, not by picking exact clock
 * times. `morningWalkInReserved`/`afternoonWalkInReserved` carve out part of
 * that count exclusively for Reception's walk-in booking — 0 (default)
 * means the feature is off and the whole count is online-bookable.
 */
export interface DoctorAvailabilityTemplate extends BaseDoc {
  doctorId: string;
  weekday: Weekday;
  morningSlots: number;
  afternoonSlots: number;
  morningWalkInReserved: number;
  afternoonWalkInReserved: number;
  status: "active" | "disabled";
}

/**
 * doctorSlots/{doctorId}_{date}_{session} — one pool per doctor/date/session,
 * not one doc per bookable unit. Booking is an atomic counter increment
 * (bookAppointment), not claiming a specific pre-existing document.
 * `generatedByTemplateId` is null for Office-created one-off pools (FR-4.5).
 * See docs/10-collections-schema.md.
 */
export interface DoctorSlot extends BaseDoc {
  doctorId: string;
  date: string; // ISO date
  session: Session;
  totalCount: number;
  /** Subset of totalCount reserved for Reception's walk-in booking (FR-4.5 add-on). */
  walkInReserved: number;
  onlineBookedCount: number;
  walkInBookedCount: number;
  status: "pendingApproval" | "approved" | "rejected" | "blocked";
  generatedByTemplateId: string | null;
}
