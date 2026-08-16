import {
  RecordVitalsRequest,
  RecordVitalsResponse,
  UpdateWardCareStatusRequest,
  UpdateWardCareStatusResponse,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const recordVitals = createCallable("recordVitals", RecordVitalsRequest, RecordVitalsResponse);

export const updateWardCareStatus = createCallable(
  "updateWardCareStatus",
  UpdateWardCareStatusRequest,
  UpdateWardCareStatusResponse,
);
