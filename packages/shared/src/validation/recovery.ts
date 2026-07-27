import { z } from "zod";

/** FR-14.2. patient only, own — no hospital binding (see HealthUpdate type doc comment). */
export const SubmitHealthUpdateRequest = z
  .object({
    condition: z.enum(["better", "same", "worse"]),
    painLevel: z.number().min(0).max(10),
    sugarMgDl: z.number().nonnegative().nullish(),
    bloodPressure: z.string().nullish(),
    temperatureC: z.number().positive().nullish(),
    weightKg: z.number().positive().nullish(),
  })
  .strict();
export type SubmitHealthUpdateRequest = z.infer<typeof SubmitHealthUpdateRequest>;

export const SubmitHealthUpdateResponse = z.object({ healthUpdateId: z.string() });
export type SubmitHealthUpdateResponse = z.infer<typeof SubmitHealthUpdateResponse>;

/** FR-14.1. patient only, own medicineLogs entry. */
export const LogMedicineStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    medicineLogId: z.string().min(1),
    patientStatus: z.enum(["taken", "missed", "skipped"]),
  })
  .strict();
export type LogMedicineStatusRequest = z.infer<typeof LogMedicineStatusRequest>;
