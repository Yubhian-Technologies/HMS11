import { z } from "zod";
import { WEEKDAYS } from "../types/base";

const BreakSchema = z.object({ start: z.string().min(1), end: z.string().min(1) }).strict();

/** FR-4.1. admin (delegated) or doctor (own) — docs/08-permission-matrix.md. */
export const CreateAvailabilityTemplateRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    weekday: z.enum(WEEKDAYS),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    slotDurationMinutes: z.number().int().positive(),
    breaks: z.array(BreakSchema).default([]),
  })
  .strict();
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
 * FR-4.4 / FR-4.5. "approved"/"rejected" — doctor, own slots only.
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

/** FR-4.4 — bulk-approve every pendingApproval slot for a doctor on one date. */
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

/** FR-4.5. office only — a slot outside the doctor's recurring template. */
export const CreateManualSlotRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })
  .strict();
export type CreateManualSlotRequest = z.infer<typeof CreateManualSlotRequest>;

export const CreateManualSlotResponse = z.object({ slotId: z.string() });
export type CreateManualSlotResponse = z.infer<typeof CreateManualSlotResponse>;
