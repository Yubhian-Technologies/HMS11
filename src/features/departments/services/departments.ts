import { z } from "zod";
import {
  CreateDepartmentRequest,
  CreateDepartmentResponse,
  UpdateDepartmentRequest,
  SetDepartmentStatusRequest,
  SetDepartmentPublicReleaseRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const setDepartmentPublicRelease = createCallable(
  "setDepartmentPublicRelease",
  SetDepartmentPublicReleaseRequest,
  SuccessResponse,
);

export const createDepartment = createCallable(
  "createDepartment",
  CreateDepartmentRequest,
  CreateDepartmentResponse,
);

export const updateDepartment = createCallable(
  "updateDepartment",
  UpdateDepartmentRequest,
  SuccessResponse,
);

export const setDepartmentStatus = createCallable(
  "setDepartmentStatus",
  SetDepartmentStatusRequest,
  SuccessResponse,
);
