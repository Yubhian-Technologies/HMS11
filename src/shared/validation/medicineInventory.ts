import { z } from "zod";

/**
 * FR-3.6. admin (own hospital) or pharmacy (own branch, restocking — wired
 * in Module 11) per docs/08-permission-matrix.md "Medicine Inventory" row.
 */
export const CreateMedicineInventoryItemRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    name: z.string().min(1),
    batchNumber: z.string().min(1),
    expiryDate: z.string().min(1),
    quantityInStock: z.number().int().nonnegative(),
    reorderLevel: z.number().int().nonnegative(),
    unitPrice: z.number().nonnegative(),
  })
  .strict();
export type CreateMedicineInventoryItemRequest = z.infer<typeof CreateMedicineInventoryItemRequest>;

export const CreateMedicineInventoryItemResponse = z.object({ itemId: z.string() });
export type CreateMedicineInventoryItemResponse = z.infer<typeof CreateMedicineInventoryItemResponse>;

/** `branchId` required — `medicineInventory` nests under the branch, so admin (not branch-scoped by claim) must say which one. */
export const UpdateMedicineInventoryItemRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    itemId: z.string().min(1),
    batchNumber: z.string().min(1).nullish(),
    expiryDate: z.string().min(1).nullish(),
    quantityInStock: z.number().int().nonnegative().nullish(),
    reorderLevel: z.number().int().nonnegative().nullish(),
    unitPrice: z.number().nonnegative().nullish(),
  })
  .strict();
export type UpdateMedicineInventoryItemRequest = z.infer<typeof UpdateMedicineInventoryItemRequest>;

export const SetMedicineInventoryItemStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    itemId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetMedicineInventoryItemStatusRequest = z.infer<typeof SetMedicineInventoryItemStatusRequest>;
