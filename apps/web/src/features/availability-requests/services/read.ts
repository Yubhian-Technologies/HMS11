import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type AvailabilityRequest } from "@hms/shared";

export type AvailabilityRequestRecord = AvailabilityRequest & { id: string };

export async function listRequestsForDoctor(
  hospitalId: string,
  branchId: string,
  doctorId: string,
): Promise<AvailabilityRequestRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "availabilityRequests"))
    .where("doctorId", "==", doctorId)
    .orderBy("date", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AvailabilityRequest) }));
}

export async function listRequestsForBranch(hospitalId: string, branchId: string): Promise<AvailabilityRequestRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "availabilityRequests"))
    .orderBy("date", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AvailabilityRequest) }));
}
