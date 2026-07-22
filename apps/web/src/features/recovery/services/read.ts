import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { HealthUpdate, MedicineLog } from "@hms/shared";

export type HealthUpdateRecord = HealthUpdate & { id: string };
export type MedicineLogRecord = MedicineLog & { id: string };

export async function listHealthUpdates(patientId: string): Promise<HealthUpdateRecord[]> {
  const snap = await getAdminDb()
    .collection("healthUpdates")
    .where("patientId", "==", patientId)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as HealthUpdate) }));
}

export async function listMedicineLogs(patientId: string): Promise<MedicineLogRecord[]> {
  const snap = await getAdminDb()
    .collection("medicineLogs")
    .where("patientId", "==", patientId)
    .orderBy("scheduledAt", "desc")
    .limit(60)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MedicineLog) }));
}
