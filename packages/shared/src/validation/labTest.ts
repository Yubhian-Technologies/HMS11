import { z } from "zod";

/** FR-3.6. admin only, own hospital, per branch. */
export const CreateLabTestRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    price: z.number().nonnegative(),
    sampleType: z.string().min(1),
  })
  .strict();
export type CreateLabTestRequest = z.infer<typeof CreateLabTestRequest>;

export const CreateLabTestResponse = z.object({ testId: z.string() });
export type CreateLabTestResponse = z.infer<typeof CreateLabTestResponse>;

export const UpdateLabTestRequest = z
  .object({
    hospitalId: z.string().min(1),
    testId: z.string().min(1),
    name: z.string().min(1).nullish(),
    category: z.string().min(1).nullish(),
    price: z.number().nonnegative().nullish(),
    sampleType: z.string().min(1).nullish(),
  })
  .strict();
export type UpdateLabTestRequest = z.infer<typeof UpdateLabTestRequest>;

export const SetLabTestStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    testId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetLabTestStatusRequest = z.infer<typeof SetLabTestStatusRequest>;
