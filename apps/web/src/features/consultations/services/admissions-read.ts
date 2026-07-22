import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Admission } from "@hms/shared";

export type AdmissionRecord = Admission & { id: string };

export async function listActiveAdmissionsForDoctor(doctorId: string): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection("admissions")
    .where("doctorId", "==", doctorId)
    .where("status", "==", "admitted")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}
