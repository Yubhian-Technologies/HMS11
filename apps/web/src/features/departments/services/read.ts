import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Department } from "@hms/shared";

export type DepartmentRecord = Department & { id: string };

export async function listDepartments(hospitalId: string): Promise<DepartmentRecord[]> {
  const snap = await getAdminDb()
    .collection("departments")
    .where("hospitalId", "==", hospitalId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Department) }));
}
