import { z } from "zod";

/** FR-17.1. patient only, own completed appointment. */
export const SubmitFeedbackRequest = z
  .object({
    appointmentId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000),
    isComplaint: z.boolean(),
  })
  .strict();
export type SubmitFeedbackRequest = z.infer<typeof SubmitFeedbackRequest>;

export const SubmitFeedbackResponse = z.object({ feedbackId: z.string() });
export type SubmitFeedbackResponse = z.infer<typeof SubmitFeedbackResponse>;

/** FR-17.2. admin only, own hospital. */
export const ResolveFeedbackRequest = z
  .object({
    hospitalId: z.string().min(1),
    feedbackId: z.string().min(1),
    status: z.enum(["acknowledged", "resolved"]),
  })
  .strict();
export type ResolveFeedbackRequest = z.infer<typeof ResolveFeedbackRequest>;
