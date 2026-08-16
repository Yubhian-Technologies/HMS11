import { z } from "zod";
import {
  SetSlotStatusRequest,
  BulkApproveSlotsRequest,
  BulkApproveSlotsResponse,
  CreateManualSlotRequest,
  CreateManualSlotResponse,
  BulkCreateManualSlotsRequest,
  BulkCreateManualSlotsResponse,
  SubmitSlotProposalRequest,
  SubmitSlotProposalResponse,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

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
export const bulkCreateManualSlots = createCallable(
  "bulkCreateManualSlots",
  BulkCreateManualSlotsRequest,
  BulkCreateManualSlotsResponse,
);
export const submitSlotProposal = createCallable(
  "submitSlotProposal",
  SubmitSlotProposalRequest,
  SubmitSlotProposalResponse,
);
