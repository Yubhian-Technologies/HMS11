import { z } from "zod";

/** FR-6.1 / FR-6.2. patient (self) or reception (on behalf), same branch as the slot. */
export const BookAppointmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    slotId: z.string().min(1),
    patientId: z.string().min(1),
    departmentId: z.string().min(1),
  })
  .strict();
export type BookAppointmentRequest = z.infer<typeof BookAppointmentRequest>;

export const BookAppointmentResponse = z.object({
  appointmentId: z.string(),
  status: z.literal("pending"),
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

/** FR-6.3. office only, own branch. */
export const SetAppointmentStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    appointmentId: z.string().min(1),
    status: z.enum(["approved", "rejected", "cancelled"]),
  })
  .strict();
export type SetAppointmentStatusRequest = z.infer<typeof SetAppointmentStatusRequest>;

/** FR-6.3. office only, own branch — moves an appointment onto a different approved slot. */
export const RescheduleAppointmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    appointmentId: z.string().min(1),
    newSlotId: z.string().min(1),
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
