import { z } from "zod";

/**
 * FR-3.1: Admin creates these five staff role types through
 * `createStaffAccount`. Doctor has its own `createDoctorAccount` action
 * (validation/staff.ts) since it requires additional clinical fields
 * (department, specialization, consultation fee — FR-3.2, FR-3.3).
 * super_admin and patient are never created through either action
 * (see docs/07-user-roles.md §7.2 provisioning rules).
 */
export const StaffRole = z.enum(["office", "reception", "nurse", "pharmacy", "lab"]);

/** All six roles Admin can provision, spanning both creation actions. */
export const ManagedStaffRole = z.enum(["office", "reception", "nurse", "doctor", "pharmacy", "lab"]);

export const CreateStaffAccountRequest = z
  .object({
    role: StaffRole,
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
  })
  .strict();
export type CreateStaffAccountRequest = z.infer<typeof CreateStaffAccountRequest>;

export const CreateStaffAccountResponse = z.object({
  uid: z.string(),
});
export type CreateStaffAccountResponse = z.infer<typeof CreateStaffAccountResponse>;

/** Edits the users/{uid} fields shared by every managed staff role, including doctor. */
export const UpdateStaffAccountRequest = z
  .object({
    uid: z.string().min(1),
    hospitalId: z.string().min(1),
    name: z.string().min(1).nullish(),
    phone: z.string().min(7).nullish(),
    branchId: z.string().min(1).nullish(),
  })
  .strict();
export type UpdateStaffAccountRequest = z.infer<typeof UpdateStaffAccountRequest>;

/** Enable/disable any staff role, including doctor — docs/08-permission-matrix.md "Staff accounts". */
export const SetStaffStatusRequest = z
  .object({
    uid: z.string().min(1),
    hospitalId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetStaffStatusRequest = z.infer<typeof SetStaffStatusRequest>;

export const PatientSignupRequest = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
  })
  .strict();
export type PatientSignupRequest = z.infer<typeof PatientSignupRequest>;

export const LoginRequest = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequest>;
