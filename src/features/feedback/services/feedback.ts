import { z } from "zod";
import { SubmitFeedbackRequest, SubmitFeedbackResponse, ResolveFeedbackRequest } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const submitFeedback = createCallable("submitFeedback", SubmitFeedbackRequest, SubmitFeedbackResponse);

export const resolveFeedback = createCallable("resolveFeedback", ResolveFeedbackRequest, SuccessResponse);
