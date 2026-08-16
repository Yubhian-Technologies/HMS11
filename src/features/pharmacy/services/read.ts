import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Prescription, type MedicineDispense } from "@hms/shared";

export type PrescriptionRecord = Prescription & { id: string };
export type DispenseRecord = MedicineDispense & { id: string };

export async function listPrescriptionsForBranch(hospitalId: string, branchId: string): Promise<PrescriptionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "prescriptions"))
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Prescription) }));
}

export async function listDispensesForPrescription(
  hospitalId: string,
  branchId: string,
  prescriptionId: string,
): Promise<DispenseRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "medicineDispenses"))
    .where("prescriptionId", "==", prescriptionId)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MedicineDispense) }));
}
