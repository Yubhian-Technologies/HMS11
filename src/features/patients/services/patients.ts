import { z } from "zod";
import {
  RegisterPatientProfileRequest,
  RegisterPatientProfileResponse,
  CreateWalkInPatientRequest,
  CreateWalkInPatientResponse,
  UpdatePatientProfileRequest,
  SetPatientStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const registerPatientProfile = createCallable(
  "registerPatientProfile",
  RegisterPatientProfileRequest,
  RegisterPatientProfileResponse,
);

export const createWalkInPatient = createCallable(
  "createWalkInPatient",
  CreateWalkInPatientRequest,
  CreateWalkInPatientResponse,
);

export const updatePatientProfile = createCallable(
  "updatePatientProfile",
  UpdatePatientProfileRequest,
  SuccessResponse,
);

export const setPatientStatus = createCallable("setPatientStatus", SetPatientStatusRequest, SuccessResponse);
