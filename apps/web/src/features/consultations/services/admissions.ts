import { z } from "zod";
import { DischargePatientRequest, DischargePatientResponse, AssignBedToAdmissionRequest } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const dischargePatient = createCallable(
  "dischargePatient",
  DischargePatientRequest,
  DischargePatientResponse,
);

export const assignBedToAdmission = createCallable(
  "assignBedToAdmission",
  AssignBedToAdmissionRequest,
  z.object({ success: z.boolean() }),
);
