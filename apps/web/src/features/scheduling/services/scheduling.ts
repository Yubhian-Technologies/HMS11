import { z } from "zod";
import {
  CreateAvailabilityTemplateRequest,
  CreateAvailabilityTemplateResponse,
  SetAvailabilityTemplateStatusRequest,
  SetSlotStatusRequest,
  BulkApproveSlotsRequest,
  BulkApproveSlotsResponse,
  CreateManualSlotRequest,
  CreateManualSlotResponse,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createAvailabilityTemplate = createCallable(
  "createAvailabilityTemplate",
  CreateAvailabilityTemplateRequest,
  CreateAvailabilityTemplateResponse,
);
export const setAvailabilityTemplateStatus = createCallable(
  "setAvailabilityTemplateStatus",
  SetAvailabilityTemplateStatusRequest,
  SuccessResponse,
);
export const setSlotStatus = createCallable("setSlotStatus", SetSlotStatusRequest, SuccessResponse);
export const bulkApproveSlots = createCallable(
  "bulkApproveSlots",
  BulkApproveSlotsRequest,
  BulkApproveSlotsResponse,
);
export const createManualSlot = createCallable(
  "createManualSlot",
  CreateManualSlotRequest,
  CreateManualSlotResponse,
);
