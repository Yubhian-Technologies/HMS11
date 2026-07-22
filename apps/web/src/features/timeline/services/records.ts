import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Prescription, LabReport } from "@hms/shared";

export type PrescriptionRecord = Prescription & { id: string };
export type LabReportRecord = LabReport & { id: string };

export async function listPatientPrescriptions(patientId: string): Promise<PrescriptionRecord[]> {
  const snap = await getAdminDb()
    .collection("prescriptions")
    .where("patientId", "==", patientId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Prescription) }));
}

export async function listPatientLabReports(patientId: string): Promise<LabReportRecord[]> {
  const snap = await getAdminDb()
    .collection("labReports")
    .where("patientId", "==", patientId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabReport) }));
}
