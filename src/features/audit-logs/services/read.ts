import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { AuditLog } from "@hms/shared";

export type AuditLogRecord = AuditLog & { id: string };

const PAGE_SIZE = 100;

/** FR-18.2. Admin — scoped to their own hospital. */
export async function listAuditLogsForHospital(hospitalId: string): Promise<AuditLogRecord[]> {
  const snap = await getAdminDb()
    .collection("auditLogs")
    .where("hospitalId", "==", hospitalId)
    .orderBy("createdAt", "desc")
    .limit(PAGE_SIZE)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AuditLog) }));
}

/** FR-18.2. Super Admin — platform-wide, most recent first. */
export async function listAllAuditLogs(): Promise<AuditLogRecord[]> {
  const snap = await getAdminDb().collection("auditLogs").orderBy("createdAt", "desc").limit(PAGE_SIZE).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as AuditLog) }));
}
