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

/** Office Room Assignment queue — doctor-flagged requests awaiting a bed. */
export async function listPendingBedAssignments(branchId: string): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection("admissions")
    .where("branchId", "==", branchId)
    .where("status", "==", "pendingBedAssignment")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}

/** Doctor's own admissions page — FR-9.5/FR-12.2, assignBedToAdmission also allows the doctor role. */
export async function listPendingBedAssignmentsForDoctor(doctorId: string): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection("admissions")
    .where("doctorId", "==", doctorId)
    .where("status", "==", "pendingBedAssignment")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}
