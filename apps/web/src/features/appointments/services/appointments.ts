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
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

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
