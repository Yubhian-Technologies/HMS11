import { z } from "zod";
import {
  CreateHospitalRequest,
  CreateHospitalResponse,
  UpdateHospitalRequest,
  SetHospitalStatusRequest,
  AssignHospitalAdminRequest,
  AssignHospitalAdminResponse,
  CreateBranchRequest,
  CreateBranchResponse,
  UpdateBranchRequest,
  SetBranchStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createHospital = createCallable(
  "createHospital",
  CreateHospitalRequest,
  CreateHospitalResponse,
);

export const updateHospital = createCallable("updateHospital", UpdateHospitalRequest, SuccessResponse);

export const setHospitalStatus = createCallable(
  "setHospitalStatus",
  SetHospitalStatusRequest,
  SuccessResponse,
);

export const assignHospitalAdmin = createCallable(
  "assignHospitalAdmin",
  AssignHospitalAdminRequest,
  AssignHospitalAdminResponse,
);

export const createBranch = createCallable("createBranch", CreateBranchRequest, CreateBranchResponse);

export const updateBranch = createCallable("updateBranch", UpdateBranchRequest, SuccessResponse);

export const setBranchStatus = createCallable(
  "setBranchStatus",
  SetBranchStatusRequest,
  SuccessResponse,
);
