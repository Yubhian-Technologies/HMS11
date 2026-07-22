import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { User, DoctorProfile, Role } from "@hms/shared";

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

export async function getDoctorProfile(uid: string): Promise<DoctorProfileRecord | null> {
  const doc = await getAdminDb().collection("doctorProfiles").doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as DoctorProfile) };
}

/** One query for all of a hospital's doctor profiles, to avoid N+1 reads when listing doctors. */
export async function listDoctorProfiles(hospitalId: string): Promise<DoctorProfileRecord[]> {
  const snap = await getAdminDb().collection("doctorProfiles").where("hospitalId", "==", hospitalId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorProfile) }));
}
