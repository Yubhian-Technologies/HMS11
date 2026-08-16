import { z } from "zod";
import {
  CreateStaffAccountRequest,
  CreateStaffAccountResponse,
  CreateDoctorAccountRequest,
  CreateDoctorAccountResponse,
  UpdateStaffAccountRequest,
  UpdateDoctorProfileRequest,
  SetStaffStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createStaffAccount = createCallable(
  "createStaffAccount",
  CreateStaffAccountRequest,
  CreateStaffAccountResponse,
);

export const createDoctorAccount = createCallable(
  "createDoctorAccount",
  CreateDoctorAccountRequest,
  CreateDoctorAccountResponse,
);

export const updateStaffAccount = createCallable(
  "updateStaffAccount",
  UpdateStaffAccountRequest,
  SuccessResponse,
);

export const updateDoctorProfile = createCallable(
  "updateDoctorProfile",
  UpdateDoctorProfileRequest,
  SuccessResponse,
);

export const setStaffStatus = createCallable("setStaffStatus", SetStaffStatusRequest, SuccessResponse);
