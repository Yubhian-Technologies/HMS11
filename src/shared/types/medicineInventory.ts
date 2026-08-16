import type { BaseDoc } from "./base";

/** medicineInventory/{id} — per branch. See docs/10-collections-schema.md. */
export interface MedicineInventoryItem extends BaseDoc {
  name: string;
  batchNumber: string;
  expiryDate: string; // ISO date
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  status: "active" | "disabled";
}
