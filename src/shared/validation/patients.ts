import { z } from "zod";
import { AddressSchema } from "./tenancy";

export const EmergencyContactSchema = z
  .object({
    name: z.string().min(1),
    relation: z.string().min(1),
    phone: z.string().min(7),
  })
  .strict();

export const InsuranceSchema = z
  .object({
    provider: z.string().min(1),
    policyNumber: z.string().min(1),
    documentUrl: z.string().nullish(),
  })
  .strict();

const PatientIntakeFields = {
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.enum(["male", "female", "other"]),
  dob: z.string().min(1),
  phone: z.string().min(7),
  address: AddressSchema,
  bloodGroup: z.string().min(1),
  emergencyContact: EmergencyContactSchema,
  medicalHistory: z.string().default(""),
  currentMedications: z.string().default(""),
  allergies: z.string().default(""),
  insurance: InsuranceSchema.nullish(),
};

/**
 * FR-1.2 / FR-5.1. The client creates the Firebase Auth account itself
 * (patient self-signup is the one role that isn't admin-provisioned —
 * docs/07-user-roles.md §7.2); this is the authenticated follow-up call
 * that writes the actual profile and sets custom claims. Email is read
 * server-side from the caller's own auth token, never trusted from the
 * request body.
 */
export const RegisterPatientProfileRequest = z.object(PatientIntakeFields).strict();
export type RegisterPatientProfileRequest = z.infer<typeof RegisterPatientProfileRequest>;

export const RegisterPatientProfileResponse = z.object({ success: z.boolean() });
export type RegisterPatientProfileResponse = z.infer<typeof RegisterPatientProfileResponse>;

/** FR-5.2. reception only, own branch — no Auth account is created. */
export const CreateWalkInPatientRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    email: z.string().email().nullish(),
    ...PatientIntakeFields,
  })
  .strict();
export type CreateWalkInPatientRequest = z.infer<typeof CreateWalkInPatientRequest>;

export const CreateWalkInPatientResponse = z.object({ patientId: z.string() });
export type CreateWalkInPatientResponse = z.infer<typeof CreateWalkInPatientResponse>;

/**
 * FR-5.3. Patient (self) may update any field; Reception/Admin may update a
 * walk-in record that belongs to their own hospital (docs/08-permission-
 * matrix.md "Patients (profile)" row — see functions/src/callable/
 * updatePatientProfile.ts for the exact scope this enforces).
 */
export const UpdatePatientProfileRequest = z
  .object({
    patientId: z.string().min(1),
    name: z.string().min(1).nullish(),
    age: z.number().int().positive().nullish(),
    gender: z.enum(["male", "female", "other"]).nullish(),
    dob: z.string().min(1).nullish(),
    phone: z.string().min(7).nullish(),
    address: AddressSchema.nullish(),
    bloodGroup: z.string().min(1).nullish(),
    emergencyContact: EmergencyContactSchema.nullish(),
    medicalHistory: z.string().nullish(),
    currentMedications: z.string().nullish(),
    allergies: z.string().nullish(),
    insurance: InsuranceSchema.nullish(),
  })
  .strict();
export type UpdatePatientProfileRequest = z.infer<typeof UpdatePatientProfileRequest>;

/** docs/07-user-roles.md §7.3 — only the patient themself or Super Admin closes an account. */
export const SetPatientStatusRequest = z
  .object({
    patientId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetPatientStatusRequest = z.infer<typeof SetPatientStatusRequest>;
