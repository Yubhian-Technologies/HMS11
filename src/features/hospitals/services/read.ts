import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Hospital, Branch, User } from "@hms/shared";

export type HospitalRecord = Hospital & { id: string };
export type BranchRecord = Branch & { id: string };
export type UserRecord = User & { id: string };

export async function listHospitals(): Promise<HospitalRecord[]> {
  const snap = await getAdminDb().collection("hospitals").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Hospital) }));
}

export async function getHospital(hospitalId: string): Promise<HospitalRecord | null> {
  const doc = await getAdminDb().collection("hospitals").doc(hospitalId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Hospital) };
}

export async function listBranches(hospitalId: string): Promise<BranchRecord[]> {
  const snap = await getAdminDb()
    .collection(`hospitals/${hospitalId}/branches`)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Branch) }));
}

export async function getUserById(uid: string): Promise<UserRecord | null> {
  const doc = await getAdminDb().collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as User) };
}
