import { z } from "zod";

/**
 * FR-3.1 + FR-3.2 + FR-3.3: creating a doctor account also requires the
 * clinical fields the generic `createStaffAccount` doesn't collect —
 * department assignment, specialization, and consultation fee.
 */
export const CreateDoctorAccountRequest = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    departmentId: z.string().min(1),
    specialization: z.string().min(1),
    qualifications: z.array(z.string().min(1)).default([]),
    consultationFee: z.number().nonnegative(),
  })
  .strict();
export type CreateDoctorAccountRequest = z.infer<typeof CreateDoctorAccountRequest>;

export const CreateDoctorAccountResponse = z.object({
  uid: z.string(),
});
export type CreateDoctorAccountResponse = z.infer<typeof CreateDoctorAccountResponse>;

/** Edits the doctorProfiles/{uid} clinical fields only — see UpdateStaffAccountRequest for name/phone/branch. */
export const UpdateDoctorProfileRequest = z
  .object({
    uid: z.string().min(1),
    hospitalId: z.string().min(1),
    departmentId: z.string().min(1).nullish(),
    specialization: z.string().min(1).nullish(),
    qualifications: z.array(z.string().min(1)).nullish(),
    consultationFee: z.number().nonnegative().nullish(),
  })
  .strict();
export type UpdateDoctorProfileRequest = z.infer<typeof UpdateDoctorProfileRequest>;
