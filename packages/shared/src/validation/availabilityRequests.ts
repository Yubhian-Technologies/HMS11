import { z } from "zod";

/** office only, own branch — asks a doctor to confirm capacity for a date. */
export const CreateAvailabilityRequestRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
    morningRequested: z.number().int().min(0),
    afternoonRequested: z.number().int().min(0),
  })
  .strict();
export type CreateAvailabilityRequestRequest = z.infer<typeof CreateAvailabilityRequestRequest>;

export const CreateAvailabilityRequestResponse = z.object({ requestId: z.string() });
export type CreateAvailabilityRequestResponse = z.infer<typeof CreateAvailabilityRequestResponse>;

/** doctor only, own request — confirms actual capacity and overall availability. */
export const RespondAvailabilityRequestRequest = z
  .object({
    hospitalId: z.string().min(1),
    requestId: z.string().min(1),
    morningAvailable: z.number().int().min(0),
    afternoonAvailable: z.number().int().min(0),
    isAvailable: z.boolean(),
  })
  .strict();
export type RespondAvailabilityRequestRequest = z.infer<typeof RespondAvailabilityRequestRequest>;
