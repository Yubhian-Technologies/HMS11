import { DischargePatientRequest, DischargePatientResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const dischargePatient = createCallable(
  "dischargePatient",
  DischargePatientRequest,
  DischargePatientResponse,
);
