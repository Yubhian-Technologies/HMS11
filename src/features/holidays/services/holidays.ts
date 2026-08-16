import { z } from "zod";
import {
  CreateHolidayRequest,
  CreateHolidayResponse,
  SetHolidayStatusRequest,
  DeleteHolidayRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createHoliday = createCallable("createHoliday", CreateHolidayRequest, CreateHolidayResponse);
export const setHolidayStatus = createCallable(
  "setHolidayStatus",
  SetHolidayStatusRequest,
  SuccessResponse,
);
export const deleteHoliday = createCallable("deleteHoliday", DeleteHolidayRequest, SuccessResponse);
