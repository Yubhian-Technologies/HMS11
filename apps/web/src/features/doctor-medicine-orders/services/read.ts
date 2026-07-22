import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { DoctorMedicineOrder } from "@hms/shared";

export type DoctorMedicineOrderRecord = DoctorMedicineOrder & { id: string };

export async function listMedicineOrdersForPatient(patientId: string): Promise<DoctorMedicineOrderRecord[]> {
  const snap = await getAdminDb()
    .collection("doctorMedicineOrders")
    .where("patientId", "==", patientId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorMedicineOrder) }));
}

/** Pharmacy Prescription Queue — every medicine a doctor has assigned in this branch. */
export async function listMedicineOrdersForBranch(branchId: string): Promise<DoctorMedicineOrderRecord[]> {
  const snap = await getAdminDb()
    .collection("doctorMedicineOrders")
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorMedicineOrder) }));
}
