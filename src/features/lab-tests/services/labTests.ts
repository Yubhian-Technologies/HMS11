import { z } from "zod";
import {
  CreateLabTestRequest,
  CreateLabTestResponse,
  UpdateLabTestRequest,
  SetLabTestStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createLabTest = createCallable("createLabTest", CreateLabTestRequest, CreateLabTestResponse);
export const updateLabTest = createCallable("updateLabTest", UpdateLabTestRequest, SuccessResponse);
export const setLabTestStatus = createCallable(
  "setLabTestStatus",
  SetLabTestStatusRequest,
  SuccessResponse,
);
