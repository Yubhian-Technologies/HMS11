import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Prescription, MedicineDispense } from "@hms/shared";

export type PrescriptionRecord = Prescription & { id: string };
export type DispenseRecord = MedicineDispense & { id: string };

export async function listPrescriptionsForBranch(branchId: string): Promise<PrescriptionRecord[]> {
  const snap = await getAdminDb()
    .collection("prescriptions")
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Prescription) }));
}

export async function listDispensesForPrescription(prescriptionId: string): Promise<DispenseRecord[]> {
  const snap = await getAdminDb()
    .collection("medicineDispenses")
    .where("prescriptionId", "==", prescriptionId)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MedicineDispense) }));
}
