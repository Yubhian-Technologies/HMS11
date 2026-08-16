import { z } from "zod";
import { SubmitHealthUpdateRequest, SubmitHealthUpdateResponse, LogMedicineStatusRequest } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const submitHealthUpdate = createCallable(
  "submitHealthUpdate",
  SubmitHealthUpdateRequest,
  SubmitHealthUpdateResponse,
);

export const logMedicineStatus = createCallable(
  "logMedicineStatus",
  LogMedicineStatusRequest,
  SuccessResponse,
);
