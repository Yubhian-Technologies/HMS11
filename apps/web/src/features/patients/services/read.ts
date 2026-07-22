import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { PatientProfile } from "@hms/shared";

export type PatientRecord = PatientProfile & { id: string };

export async function getPatientProfile(patientId: string): Promise<PatientRecord | null> {
  const doc = await getAdminDb().collection("patients").doc(patientId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as PatientProfile) };
}

export async function listWalkInPatients(hospitalId: string, branchId: string): Promise<PatientRecord[]> {
  const snap = await getAdminDb()
    .collection("patients")
    .where("hospitalId", "==", hospitalId)
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as PatientProfile) }));
}
