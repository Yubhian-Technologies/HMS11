import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { LabOrder, LabReport } from "@hms/shared";

export type LabOrderRecord = LabOrder & { id: string };
export type LabReportRecord = LabReport & { id: string };

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

/** Doctor Labs module — every lab order this doctor has assigned, any status. */
export async function listLabOrdersForDoctor(doctorId: string): Promise<LabOrderRecord[]> {
  const snap = await getAdminDb()
    .collection("labOrders")
    .where("doctorId", "==", doctorId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabOrder) }));
}

/** Doctor Labs module — the uploaded report for an order, once available. */
export async function getLabReportForOrder(labOrderId: string): Promise<LabReportRecord | null> {
  const snap = await getAdminDb().collection("labReports").where("labOrderId", "==", labOrderId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as LabReport) };
}

/** Office Lab Payments module — standalone orders awaiting payment before they enter the pipeline. */
export async function listPendingPaymentLabOrders(branchId: string): Promise<LabOrderRecord[]> {
  const snap = await getAdminDb()
    .collection("labOrders")
    .where("branchId", "==", branchId)
    .where("status", "==", "pendingPayment")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LabOrder) }));
}
