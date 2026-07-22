import { z } from "zod";
import {
  CreateAvailabilityRequestRequest,
  CreateAvailabilityRequestResponse,
  RespondAvailabilityRequestRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createAvailabilityRequest = createCallable(
  "createAvailabilityRequest",
  CreateAvailabilityRequestRequest,
  CreateAvailabilityRequestResponse,
);
export const respondAvailabilityRequest = createCallable(
  "respondAvailabilityRequest",
  RespondAvailabilityRequestRequest,
  SuccessResponse,
);
