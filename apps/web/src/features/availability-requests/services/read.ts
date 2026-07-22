import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { AvailabilityRequest } from "@hms/shared";

export type AvailabilityRequestRecord = AvailabilityRequest & { id: string };

export async function listRequestsForDoctor(doctorId: string): Promise<AvailabilityRequestRecord[]> {
  const snap = await getAdminDb()
    .collection("availabilityRequests")
    .where("doctorId", "==", doctorId)
    .orderBy("date", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AvailabilityRequest) }));
}

export async function listRequestsForBranch(branchId: string): Promise<AvailabilityRequestRecord[]> {
  const snap = await getAdminDb()
    .collection("availabilityRequests")
    .where("branchId", "==", branchId)
    .orderBy("date", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AvailabilityRequest) }));
}
