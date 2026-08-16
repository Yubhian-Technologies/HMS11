import { z } from "zod";

const SessionSchema = z.enum(["morning", "afternoon"]);

/**
 * FR-6.1 / FR-6.2. patient (self) or reception (on behalf), same branch as
 * the session pool. No slotId — booking draws from the (doctorId, date,
 * session) pool's counter; which bucket (online vs. walk-in-reserved) is
 * decided server-side by the caller's role, not the client.
 */
export const BookAppointmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string().min(1),
    session: SessionSchema,
    patientId: z.string().min(1),
    departmentId: z.string().min(1),
  })
  .strict();
export type BookAppointmentRequest = z.infer<typeof BookAppointmentRequest>;

export const BookAppointmentResponse = z.object({
  appointmentId: z.string(),
  status: z.enum(["PENDING", "BOOKED"]),
});
export type BookAppointmentResponse = z.infer<typeof BookAppointmentResponse>;

/** FR-7.1 / FR-7.2. reception or office, own branch — bypasses slots entirely. */
export const CreateEmergencyAppointmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    departmentId: z.string().min(1),
  })
  .strict();
export type CreateEmergencyAppointmentRequest = z.infer<typeof CreateEmergencyAppointmentRequest>;

export const CreateEmergencyAppointmentResponse = z.object({ appointmentId: z.string() });
export type CreateEmergencyAppointmentResponse = z.infer<typeof CreateEmergencyAppointmentResponse>;

/**
 * FR-6.3. office only, own branch. `BOOKED` = approve (patient-visible,
 * eligible for check-in); `REJECTED`/`CANCELLED` end the appointment.
 */
export const SetAppointmentStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
    status: z.enum(["BOOKED", "REJECTED", "CANCELLED"]),
  })
  .strict();
export type SetAppointmentStatusRequest = z.infer<typeof SetAppointmentStatusRequest>;

/**
 * FR-6.3. office only, own branch — moves an appointment onto a different
 * approved session pool for the same doctor.
 */
export const RescheduleAppointmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    appointmentId: z.string().min(1),
    newDate: z.string().min(1),
    newSession: SessionSchema,
  })
  .strict();
export type RescheduleAppointmentRequest = z.infer<typeof RescheduleAppointmentRequest>;

/** FR-6.5. patient (self) or reception, when no slot is currently open. */
export const JoinWaitingListRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    departmentId: z.string().min(1),
    date: z.string().min(1),
  })
  .strict();
export type JoinWaitingListRequest = z.infer<typeof JoinWaitingListRequest>;

export const JoinWaitingListResponse = z.object({
  appointmentId: z.string(),
  waitingListPosition: z.number(),
});
export type JoinWaitingListResponse = z.infer<typeof JoinWaitingListResponse>;
