import {
  AdvanceLabOrderStatusRequest,
  UploadLabReportRequest,
  UploadLabReportResponse,
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

export const markLabOrderPaid = createCallable("markLabOrderPaid", MarkLabOrderPaidRequest, SuccessResponse);
