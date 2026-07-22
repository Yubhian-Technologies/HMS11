import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { MedicineInventoryItem } from "@hms/shared";

export type MedicineInventoryRecord = MedicineInventoryItem & { id: string };

export async function listMedicineInventory(branchId: string): Promise<MedicineInventoryRecord[]> {
  const snap = await getAdminDb()
    .collection("medicineInventory")
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MedicineInventoryItem) }));
}
