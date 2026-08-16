import { z } from "zod";
import { WEEKDAYS } from "../types/base";

export const AddressSchema = z
  .object({
    line1: z.string().min(1),
    line2: z.string().nullish(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  })
  .strict();

export const BranchTimingSchema = z
  .object({
    day: z.enum(WEEKDAYS),
    open: z.string().min(1),
    close: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// Hospitals — FR-2.1. super_admin only (docs/08-permission-matrix.md "Hospitals").
// ---------------------------------------------------------------------------

export const CreateHospitalRequest = z
  .object({
    name: z.string().min(1),
    registrationNumber: z.string().nullish(),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(7),
    address: AddressSchema,
  })
  .strict();
export type CreateHospitalRequest = z.infer<typeof CreateHospitalRequest>;

export const CreateHospitalResponse = z.object({
  hospitalId: z.string(),
  mainBranchId: z.string(),
});
export type CreateHospitalResponse = z.infer<typeof CreateHospitalResponse>;

export const UpdateHospitalRequest = z
  .object({
    hospitalId: z.string().min(1),
    name: z.string().min(1).nullish(),
    registrationNumber: z.string().nullish(),
    contactEmail: z.string().email().nullish(),
    contactPhone: z.string().min(7).nullish(),
    address: AddressSchema.nullish(),
  })
  .strict();
export type UpdateHospitalRequest = z.infer<typeof UpdateHospitalRequest>;

export const SetHospitalStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetHospitalStatusRequest = z.infer<typeof SetHospitalStatusRequest>;

// ---------------------------------------------------------------------------
// Hospital Admin assignment — FR-2.4. super_admin only
// (docs/07-user-roles.md §7.2: admin accounts are created only by super_admin).
// ---------------------------------------------------------------------------

export const AssignHospitalAdminRequest = z
  .object({
    hospitalId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(8),
  })
  .strict();
export type AssignHospitalAdminRequest = z.infer<typeof AssignHospitalAdminRequest>;

export const AssignHospitalAdminResponse = z.object({
  uid: z.string(),
});
export type AssignHospitalAdminResponse = z.infer<typeof AssignHospitalAdminResponse>;

// ---------------------------------------------------------------------------
// Branches — FR-2.3. super_admin, or admin scoped to their own hospital
// (docs/08-permission-matrix.md "Branches").
// ---------------------------------------------------------------------------

export const CreateBranchRequest = z
  .object({
    hospitalId: z.string().min(1),
    name: z.string().min(1),
    address: AddressSchema,
    contactPhone: z.string().min(7),
  })
  .strict();
export type CreateBranchRequest = z.infer<typeof CreateBranchRequest>;

export const CreateBranchResponse = z.object({
  branchId: z.string(),
});
export type CreateBranchResponse = z.infer<typeof CreateBranchResponse>;

export const UpdateBranchRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    name: z.string().min(1).nullish(),
    address: AddressSchema.nullish(),
    contactPhone: z.string().min(7).nullish(),
    timings: z.array(BranchTimingSchema).nullish(),
  })
  .strict();
export type UpdateBranchRequest = z.infer<typeof UpdateBranchRequest>;

export const SetBranchStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetBranchStatusRequest = z.infer<typeof SetBranchStatusRequest>;
