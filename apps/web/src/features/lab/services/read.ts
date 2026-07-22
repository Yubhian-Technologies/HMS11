import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { LabOrder } from "@hms/shared";

export type LabOrderRecord = LabOrder & { id: string };

const PIPELINE_STATUSES = [
  "pending",
  "sampleCollected",
  "processing",
  "completed",
  "verified",
  "reportUploaded",
] as const;

export async function listLabOrdersByBranch(branchId: string): Promise<Record<string, LabOrderRecord[]>> {
  const db = getAdminDb();
  const grouped: Record<string, LabOrderRecord[]> = {};
  await Promise.all(
    PIPELINE_STATUSES.map(async (status) => {
      const snap = await db
        .collection("labOrders")
        .where("branchId", "==", branchId)
        .where("status", "==", status)
        .orderBy("createdAt", "asc")
        .get();
      grouped[status] = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabOrder) }));
    }),
  );
  return grouped;
}
