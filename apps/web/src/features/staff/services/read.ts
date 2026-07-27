import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, doctorPath, type User, type DoctorProfile, type Role } from "@hms/shared";

export type UserRecord = User & { id: string };
export type DoctorProfileRecord = DoctorProfile & { id: string };

export async function listStaffByRole(hospitalId: string, role: Role): Promise<UserRecord[]> {
  const snap = await getAdminDb()
    .collection("users")
    .where("hospitalId", "==", hospitalId)
    .where("role", "==", role)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as User) }));
}

/** The `doctors/{uid}` extension doc, nested under its branch (renamed from the old flat `doctorProfiles`). */
export async function getDoctorProfile(
  hospitalId: string,
  branchId: string,
  uid: string,
): Promise<DoctorProfileRecord | null> {
  const doc = await getAdminDb().doc(doctorPath(hospitalId, branchId, uid)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as DoctorProfile) };
}

/** One query for all of a branch's doctor profiles, to avoid N+1 reads when listing doctors. */
export async function listDoctorProfiles(hospitalId: string, branchId: string): Promise<DoctorProfileRecord[]> {
  const snap = await getAdminDb().collection(branchCollection(hospitalId, branchId, "doctors")).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorProfile) }));
}

/** Admin's hospital-wide Staff page spans every branch — one collectionGroup scan instead of N per-branch reads. */
export async function listDoctorProfilesForHospital(hospitalId: string): Promise<DoctorProfileRecord[]> {
  const snap = await getAdminDb().collectionGroup("doctors").where("hospitalId", "==", hospitalId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorProfile) }));
}
