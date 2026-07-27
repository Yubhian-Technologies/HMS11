import { CheckInPatientRequest, CheckInPatientResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

// recordVitals moved to features/nurse — vitals capture is Nurse's, not Reception's.
export const checkInPatient = createCallable(
  "checkInPatient",
  CheckInPatientRequest,
  CheckInPatientResponse,
);
