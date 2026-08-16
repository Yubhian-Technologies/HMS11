import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type MedicineInventoryItem } from "@hms/shared";

export type MedicineInventoryRecord = MedicineInventoryItem & { id: string };

export async function listMedicineInventory(hospitalId: string, branchId: string): Promise<MedicineInventoryRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "medicineInventory"))
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MedicineInventoryItem) }));
}
