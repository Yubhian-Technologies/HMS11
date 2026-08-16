import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Admission } from "@hms/shared";

export type AdmissionRecord = Admission & { id: string };

export async function listActiveAdmissionsForDoctor(
  hospitalId: string,
  branchId: string,
  doctorId: string,
): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "admissions"))
    .where("doctorId", "==", doctorId)
    .where("status", "==", "admitted")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}

/** Nurse's own ward-care queue — patients currently admitted under this nurse's assignment. */
export async function listActiveAdmissionsForNurse(
  hospitalId: string,
  branchId: string,
  nurseId: string,
): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "admissions"))
    .where("nurseId", "==", nurseId)
    .where("status", "==", "admitted")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}

/** Office Room Assignment queue — every currently-admitted patient in the branch, for nurse assignment. */
export async function listActiveAdmissions(hospitalId: string, branchId: string): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "admissions"))
    .where("status", "==", "admitted")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}

/** Office Room Assignment queue — doctor-flagged requests awaiting a bed. */
export async function listPendingBedAssignments(hospitalId: string, branchId: string): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "admissions"))
    .where("status", "==", "pendingBedAssignment")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}

/** Doctor's own admissions page — assignBedToAdmission also allows the doctor role. */
export async function listPendingBedAssignmentsForDoctor(
  hospitalId: string,
  branchId: string,
  doctorId: string,
): Promise<AdmissionRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "admissions"))
    .where("doctorId", "==", doctorId)
    .where("status", "==", "pendingBedAssignment")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Admission) }));
}
