import { SubmitConsultationRequest, SubmitConsultationResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const submitConsultation = createCallable(
  "submitConsultation",
  SubmitConsultationRequest,
  SubmitConsultationResponse,
);
