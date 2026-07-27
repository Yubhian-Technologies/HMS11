import { z } from "zod";
import { WEEKDAYS } from "../types/base";

const SessionSchema = z.enum(["morning", "afternoon"]);

/**
 * FR-4.1. admin (delegated) or doctor (own) — docs/08-permission-matrix.md.
 * Count-based, not a picked time range — see AVAILABILITY_WINDOWS.
 * `*WalkInReserved` carves out part of each session's count exclusively for
 * Reception's walk-in booking (FR-4.5 add-on) — 0 means the option is off.
 */
export const CreateAvailabilityTemplateRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    weekday: z.enum(WEEKDAYS),
    morningSlots: z.number().int().min(0),
    afternoonSlots: z.number().int().min(0),
    morningWalkInReserved: z.number().int().min(0).default(0),
    afternoonWalkInReserved: z.number().int().min(0).default(0),
  })
  .strict()
  .refine((v) => v.morningSlots > 0 || v.afternoonSlots > 0, {
    message: "At least one of morning or afternoon slots must be greater than 0.",
    path: ["morningSlots"],
  })
  .refine((v) => v.morningWalkInReserved <= v.morningSlots, {
    message: "Morning walk-in reservation can't exceed the morning slot count.",
    path: ["morningWalkInReserved"],
  })
  .refine((v) => v.afternoonWalkInReserved <= v.afternoonSlots, {
    message: "Afternoon walk-in reservation can't exceed the afternoon slot count.",
    path: ["afternoonWalkInReserved"],
  });
export type CreateAvailabilityTemplateRequest = z.infer<typeof CreateAvailabilityTemplateRequest>;

export const CreateAvailabilityTemplateResponse = z.object({ templateId: z.string() });
export type CreateAvailabilityTemplateResponse = z.infer<typeof CreateAvailabilityTemplateResponse>;

export const SetAvailabilityTemplateStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    templateId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetAvailabilityTemplateStatusRequest = z.infer<typeof SetAvailabilityTemplateStatusRequest>;

/**
 * FR-4.4 / FR-4.5. "approved"/"rejected" — doctor, own session pool only.
 * "blocked" — office, own branch. See docs/13-cloud-functions.md.
 */
export const SetSlotStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    slotId: z.string().min(1),
    status: z.enum(["approved", "rejected", "blocked"]),
  })
  .strict();
export type SetSlotStatusRequest = z.infer<typeof SetSlotStatusRequest>;

/** FR-4.4 — bulk-approve every pendingApproval session pool for a doctor on one date. */
export const BulkApproveSlotsRequest = z
  .object({
    hospitalId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
  })
  .strict();
export type BulkApproveSlotsRequest = z.infer<typeof BulkApproveSlotsRequest>;

export const BulkApproveSlotsResponse = z.object({ approvedCount: z.number() });
export type BulkApproveSlotsResponse = z.infer<typeof BulkApproveSlotsResponse>;

/**
 * FR-4.5. office only — adds capacity outside the doctor's recurring
 * template: creates the session's pool if none exists yet (starts
 * "approved" — Office is acting on the doctor's behalf), or tops up an
 * existing pool's count if the template already generated one.
 */
export const CreateManualSlotRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
    session: SessionSchema,
    count: z.number().int().positive(),
    walkInReserved: z.number().int().min(0).default(0),
  })
  .strict()
  .refine((v) => v.walkInReserved <= v.count, {
    message: "Walk-in reservation can't exceed the added count.",
    path: ["walkInReserved"],
  });
export type CreateManualSlotRequest = z.infer<typeof CreateManualSlotRequest>;

export const CreateManualSlotResponse = z.object({ slotId: z.string() });
export type CreateManualSlotResponse = z.infer<typeof CreateManualSlotResponse>;
