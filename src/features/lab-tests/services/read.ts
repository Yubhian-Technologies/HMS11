import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type LabTestMasterItem } from "@hms/shared";

export type LabTestRecord = LabTestMasterItem & { id: string };

export async function listLabTests(hospitalId: string, branchId: string): Promise<LabTestRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "labTestMaster"))
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabTestMasterItem) }));
}
