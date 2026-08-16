import { z } from "zod";
import {
  BookAppointmentRequest,
  BookAppointmentResponse,
  CreateEmergencyAppointmentRequest,
  CreateEmergencyAppointmentResponse,
  SetAppointmentStatusRequest,
  RescheduleAppointmentRequest,
  JoinWaitingListRequest,
  JoinWaitingListResponse,
  CheckInPatientRequest,
  CheckInPatientResponse,
  StartConsultationRequest,
  StartConsultationResponse,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

/** Office validates attendance (moved off Reception — the front desk only handles walk-in booking now). */
export const checkInPatient = createCallable(
  "checkInPatient",
  CheckInPatientRequest,
  CheckInPatientResponse,
);

/** VITALS_COMPLETED -> CONSULTING, when the doctor opens the chart. */
export const startConsultation = createCallable(
  "startConsultation",
  StartConsultationRequest,
  StartConsultationResponse,
);

export const bookAppointment = createCallable(
  "bookAppointment",
  BookAppointmentRequest,
  BookAppointmentResponse,
);

export const createEmergencyAppointment = createCallable(
  "createEmergencyAppointment",
  CreateEmergencyAppointmentRequest,
  CreateEmergencyAppointmentResponse,
);

export const setAppointmentStatus = createCallable(
  "setAppointmentStatus",
  SetAppointmentStatusRequest,
  SuccessResponse,
);

export const rescheduleAppointment = createCallable(
  "rescheduleAppointment",
  RescheduleAppointmentRequest,
  SuccessResponse,
);

export const joinWaitingList = createCallable(
  "joinWaitingList",
  JoinWaitingListRequest,
  JoinWaitingListResponse,
);
