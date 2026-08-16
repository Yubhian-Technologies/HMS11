import type { BaseDoc } from "./base";

export type Session = "morning" | "afternoon";

/**
 * Display-only session windows — a doctor's availability is a count, not a
 * picked start/end time range, and generated doctorSlots pool docs carry no
 * clock time either (a consultation's actual duration can't be predicted,
 * so nothing pretends to). This is purely a UI label (e.g. "Morning ·
 * 09:00–13:00") for the two fixed sessions a day is split into, and the
 * anchor `expireStaleAppointments` uses to compute a session's check-in
 * cutoff instant (session start + `DoctorSlot.checkInCutoffMinutes`).
 */
export const AVAILABILITY_WINDOWS = {
  morning: { start: "09:00", end: "13:00" },
  afternoon: { start: "14:00", end: "18:00" },
} as const;

/**
 * doctorSlots/{doctorId}_{date}_{session} — one pool per doctor/date/session,
 * not one doc per bookable unit. Booking is an atomic counter increment
 * (bookAppointment), not claiming a specific pre-existing document.
 * See docs/10-collections-schema.md.
 *
 * Capacity planning is Office-initiated and doctor-confirmed (not
 * doctor-authored recurring templates — that mechanism was retired in favor
 * of this one, single-source flow):
 *   Office (createManualSlot) → `proposed`
 *   Doctor confirms the total, may adjust the count (submitSlotProposal) → `doctorReviewed`
 *   Office splits the confirmed total into Online/Walk-in pools and
 *     releases it (setSlotStatus → `approved`), setting `walkInReserved`
 *     and `checkInCutoffMinutes` at that point — the split and the
 *     no-show cutoff are both Office's decision, not the doctor's.
 */
export interface DoctorSlot extends BaseDoc {
  doctorId: string;
  date: string; // ISO date
  session: Session;
  totalCount: number;
  /** Subset of totalCount reserved for Reception's walk-in booking. Office-owned; set at publish time. */
  walkInReserved: number;
  onlineBookedCount: number;
  walkInBookedCount: number;
  /**
   * Minutes past session start (see AVAILABILITY_WINDOWS) after which a
   * still-`BOOKED` (not checked in) appointment against this pool is
   * expired and its held unit reclaimed into the walk-in pool
   * (expireStaleAppointments). Office-owned; set at publish time.
   */
  checkInCutoffMinutes: number;
  /**
   * Lifecycle:
   * - `proposed`       — created by Office, awaiting the doctor's review.
   * - `doctorReviewed` — doctor confirmed (optionally adjusted) the total capacity, sent back to Office.
   * - `approved`       — Office split the confirmed total into Online/Walk-in pools and released it.
   *                      Only `approved` pools are bookable.
   * - `rejected`       — declined by the doctor or withdrawn by Office.
   * - `blocked`        — pulled out of circulation by Office regardless of prior status.
   */
  status: "proposed" | "doctorReviewed" | "approved" | "rejected" | "blocked";
}
