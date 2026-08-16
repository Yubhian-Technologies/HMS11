import { z } from "zod";

/**
 * FR-11.2 / FR-11.3. pharmacy only, own branch. Decrements the named
 * inventory item and schedules one medicineLog reminder per day of the
 * course (docs/10-collections-schema.md MedicineLog doc comment).
 */
export const DispenseMedicineRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    prescriptionId: z.string().min(1),
    prescriptionItemIndex: z.number().int().nonnegative(),
    medicineInventoryItemId: z.string().min(1),
    quantityDispensed: z.number().int().positive(),
  })
  .strict();
export type DispenseMedicineRequest = z.infer<typeof DispenseMedicineRequest>;

export const DispenseMedicineResponse = z.object({
  dispenseId: z.string(),
  medicineLogIds: z.array(z.string()),
});
export type DispenseMedicineResponse = z.infer<typeof DispenseMedicineResponse>;
