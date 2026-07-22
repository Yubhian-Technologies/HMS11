import {
  AdvanceLabOrderStatusRequest,
  UploadLabReportRequest,
  UploadLabReportResponse,
  AssignLabOrderRequest,
  AssignLabOrderResponse,
  MarkLabOrderPaidRequest,
} from "@hms/shared";
import { z } from "zod";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const advanceLabOrderStatus = createCallable(
  "advanceLabOrderStatus",
  AdvanceLabOrderStatusRequest,
  SuccessResponse,
);

export const uploadLabReport = createCallable(
  "uploadLabReport",
  UploadLabReportRequest,
  UploadLabReportResponse,
);

export const assignLabOrder = createCallable("assignLabOrder", AssignLabOrderRequest, AssignLabOrderResponse);

export const markLabOrderPaid = createCallable("markLabOrderPaid", MarkLabOrderPaidRequest, SuccessResponse);
