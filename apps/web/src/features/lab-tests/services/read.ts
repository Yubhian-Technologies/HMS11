import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { LabTestMasterItem } from "@hms/shared";

export type LabTestRecord = LabTestMasterItem & { id: string };

export async function listLabTests(branchId: string): Promise<LabTestRecord[]> {
  const snap = await getAdminDb()
    .collection("labTestMaster")
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabTestMasterItem) }));
}
