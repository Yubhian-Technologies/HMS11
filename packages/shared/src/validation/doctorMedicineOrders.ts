import { z } from "zod";

const OrderItemSchema = z
  .object({
    medicineInventoryId: z.string().min(1),
    medicineName: z.string().min(1),
    durationDays: z.number().int().positive(),
  })
  .strict();

/** doctor only, own branch — medicine + duration only, no dosage/frequency (Pharmacy's job). */
export const AssignMedicineOrderRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    items: z.array(OrderItemSchema).min(1),
  })
  .strict();
export type AssignMedicineOrderRequest = z.infer<typeof AssignMedicineOrderRequest>;

export const AssignMedicineOrderResponse = z.object({ orderId: z.string() });
export type AssignMedicineOrderResponse = z.infer<typeof AssignMedicineOrderResponse>;
