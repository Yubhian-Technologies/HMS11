import { z } from "zod";

const SessionSchema = z.enum(["morning", "afternoon"]);

const DEFAULT_CHECK_IN_CUTOFF_MINUTES = 15;

/**
 * FR-4.4 / FR-4.5. "rejected" — doctor declines an unreviewed Office
 * proposal, or Office withdraws its own proposed/doctorReviewed one.
 * "approved" — Office publishing a doctor-reviewed proposal (the capacity
 * split — `walkInReserved`/`checkInCutoffMinutes` — happens here) or
 * unblocking a previously-blocked pool. "blocked" — Office pulls an
 * approved pool out of circulation. `doctorReviewed` is never set through
 * this endpoint — that's submitSlotProposal's job.
 */
export const SetSlotStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    slotId: z.string().min(1),
    status: z.enum(["approved", "rejected", "blocked"]),
    /** Office's split decision — required when publishing a doctorReviewed proposal. */
    walkInReserved: z.number().int().min(0).optional(),
    /** Office's no-show cutoff decision — required when publishing a doctorReviewed proposal. */
    checkInCutoffMinutes: z.number().int().positive().optional(),
  })
  .strict();
export type SetSlotStatusRequest = z.infer<typeof SetSlotStatusRequest>;

/**
 * Doctor confirms (optionally adjusting) the total capacity of an
 * Office-created proposal and sends it back. Sets `status` to
 * `doctorReviewed`. The doctor never sets the online/walk-in split or the
 * no-show cutoff — those are Office's decision, made when Office publishes
 * the proposal (setSlotStatus → `approved`).
 */
export const SubmitSlotProposalRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    slotId: z.string().min(1),
    totalCount: z.number().int().positive(),
  })
  .strict();
export type SubmitSlotProposalRequest = z.infer<typeof SubmitSlotProposalRequest>;

export const SubmitSlotProposalResponse = z.object({ success: z.boolean() });
export type SubmitSlotProposalResponse = z.infer<typeof SubmitSlotProposalResponse>;

/** Doctor bulk-confirms every Office-proposed slot for one date, at Office's proposed totals (no per-slot edits). */
export const BulkApproveSlotsRequest = z
  .object({
    hospitalId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
  })
  .strict();
export type BulkApproveSlotsRequest = z.infer<typeof BulkApproveSlotsRequest>;

export const BulkApproveSlotsResponse = z.object({ confirmedCount: z.number() });
export type BulkApproveSlotsResponse = z.infer<typeof BulkApproveSlotsResponse>;

/**
 * FR-4.1 / FR-4.5. Office only — the sole way a capacity pool originates
 * (the earlier doctor-authored recurring-template + nightly-generation
 * mechanism was retired in favor of this single Office-initiated flow).
 * Creates the session's pool as `proposed` if none exists yet, or tops up
 * an existing pool's total if Office is adding more capacity to one already
 * in flight. The online/walk-in split isn't set here — that's Office's
 * decision at publish time (setSlotStatus), after the doctor has confirmed
 * the total.
 */
export const CreateManualSlotRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
    session: SessionSchema,
    count: z.number().int().positive(),
  })
  .strict();
export type CreateManualSlotRequest = z.infer<typeof CreateManualSlotRequest>;

export const CreateManualSlotResponse = z.object({ slotId: z.string() });
export type CreateManualSlotResponse = z.infer<typeof CreateManualSlotResponse>;

/**
 * Phase A step 1 — Office initiates the rolling 3-day slot request in one
 * action: one morning count + one afternoon count, applied to every day in
 * the current rolling 3-day window (today, today+1, today+2) for one
 * doctor — up to 6 session-unit proposals in a single call, instead of the
 * doctor/session-at-a-time createManualSlot. Same create-or-top-up
 * semantics per (date, session) pair as createManualSlot; a 0 count for a
 * session skips that session entirely (e.g. morning-only requests).
 */
export const BulkCreateManualSlotsRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    morningCount: z.number().int().min(0),
    afternoonCount: z.number().int().min(0),
  })
  .strict()
  .refine((v) => v.morningCount > 0 || v.afternoonCount > 0, {
    message: "At least one of morning or afternoon count must be greater than 0.",
    path: ["morningCount"],
  });
export type BulkCreateManualSlotsRequest = z.infer<typeof BulkCreateManualSlotsRequest>;

export const BulkCreateManualSlotsResponse = z.object({ slotIds: z.array(z.string()) });
export type BulkCreateManualSlotsResponse = z.infer<typeof BulkCreateManualSlotsResponse>;

/**
 * Patient-facing, platform-wide department directory for booking — no
 * request fields, caller identified from the verified token. Deliberately
 * doctor-anonymous: a patient picks a department (defaulting to whatever
 * department is flagged `isGeneral` — typically "General Medicine" — with
 * every other released department offered as an optional specialization),
 * never a specific doctor by name. The system auto-assigns within the
 * chosen department at booking time (bookAppointment). Only departments
 * Office has released at that branch (departmentReleases.publiclyBookable)
 * are included, and only for (date, session) combinations where at least
 * one doctor in that department has an approved slot with room.
 *
 * A patient has no rules-compliant Firestore read to discover any of this
 * platform-wide (departments/doctors/slots reads are all hospital/branch-
 * staff-scoped or ownership-scoped), so this callable (Admin SDK, bypasses
 * rules) is the only way in — same reasoning as the doctor-based version
 * this replaced.
 */
export const BookableDepartmentSlotSchema = z.object({
  date: z.string(),
  session: SessionSchema,
  availableCount: z.number().int().nonnegative(),
});
export const BookableDepartmentSchema = z.object({
  hospitalId: z.string(),
  branchId: z.string(),
  departmentId: z.string(),
  departmentName: z.string(),
  isGeneral: z.boolean(),
  slots: z.array(BookableDepartmentSlotSchema),
});
export const ListBookableDepartmentsResponse = z.object({ departments: z.array(BookableDepartmentSchema) });
export type ListBookableDepartmentsResponse = z.infer<typeof ListBookableDepartmentsResponse>;

export { DEFAULT_CHECK_IN_CUTOFF_MINUTES };
