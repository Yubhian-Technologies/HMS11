import { z } from "zod";

/** FR-3.4. admin only, own hospital, per branch. */
export const CreateHolidayRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    date: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
export type CreateHolidayRequest = z.infer<typeof CreateHolidayRequest>;

export const CreateHolidayResponse = z.object({ holidayId: z.string() });
export type CreateHolidayResponse = z.infer<typeof CreateHolidayResponse>;

export const SetHolidayStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    holidayId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetHolidayStatusRequest = z.infer<typeof SetHolidayStatusRequest>;

/**
 * admin only, own hospital. The one true hard-delete in the app — holidays
 * are a non-clinical scheduling record, so this is a deliberate, narrow
 * exception to NFR-7.1 rather than the general pattern (see AuditLog).
 */
export const DeleteHolidayRequest = z
  .object({
    hospitalId: z.string().min(1),
    holidayId: z.string().min(1),
  })
  .strict();
export type DeleteHolidayRequest = z.infer<typeof DeleteHolidayRequest>;
