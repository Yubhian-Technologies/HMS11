import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type DoctorMedicineOrder } from "@hms/shared";

export type DoctorMedicineOrderRecord = DoctorMedicineOrder & { id: string };

/** Patient's own cross-hospital view — `doctorMedicineOrders` is branch-nested, so this needs a collectionGroup scan. */
export async function listMedicineOrdersForPatient(patientId: string): Promise<DoctorMedicineOrderRecord[]> {
  const snap = await getAdminDb()
    .collectionGroup("doctorMedicineOrders")
    .where("patientId", "==", patientId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorMedicineOrder) }));
}

/** Pharmacy Prescription Queue — every medicine a doctor has assigned in this branch. */
export async function listMedicineOrdersForBranch(
  hospitalId: string,
  branchId: string,
): Promise<DoctorMedicineOrderRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "doctorMedicineOrders"))
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorMedicineOrder) }));
}
