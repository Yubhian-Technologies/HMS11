import { CheckInPatientRequest, CheckInPatientResponse, RecordVitalsRequest, RecordVitalsResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const checkInPatient = createCallable(
  "checkInPatient",
  CheckInPatientRequest,
  CheckInPatientResponse,
);

export const recordVitals = createCallable("recordVitals", RecordVitalsRequest, RecordVitalsResponse);
