import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AuditLog } from "@hms/shared";

export interface AuditContext {
  actorId: string;
  actorRole: string;
  /** "platform" for super_admin-scoped actions with no owning hospital. */
  hospitalId: string;
}

export interface WriteWithAuditParams {
  collection: string;
  /** Omit to auto-generate a new document id. */
  docId?: string;
  data: Record<string, unknown>;
  action: "create" | "update" | "statusChange";
  /** Field snapshot before the write, for the audit trail. Required for update/statusChange. */
  before?: Record<string, unknown> | null;
  context: AuditContext;
  /**
   * Semantic entity name recorded on the audit log, e.g. "appointments" —
   * defaults to `collection`. Pass this explicitly when `collection` is a
   * full nested Firestore path (e.g. `branchCollection(...)`) so the audit
   * trail still reads as the short collection name rather than the whole path.
   */
  entityType?: string;
}

/**
 * The single write path every clinical/administrative mutation must go
 * through (docs/02-missing-features.md §8, docs/11-folder-structure.md rule
 * 4). Writes the target document and its immutable auditLogs entry in one
 * transaction, so a committed write can never end up without an audit
 * record. Lives in its own package (@hms/shared-server, depends on
 * firebase-admin) rather than @hms/shared itself, so it is structurally
 * impossible for a client component to import it by accident — a real
 * package boundary instead of a naming convention.
 */
export async function writeWithAudit(
  db: Firestore,
  params: WriteWithAuditParams,
): Promise<string> {
  const targetRef = params.docId
    ? db.collection(params.collection).doc(params.docId)
    : db.collection(params.collection).doc();
  const auditRef = db.collection("auditLogs").doc();

  await db.runTransaction(async (tx: Transaction) => {
    tx.set(
      targetRef,
      {
        ...params.data,
        ...(params.action === "create" ? { createdAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: params.action !== "create" },
    );

    const auditLog: Omit<AuditLog, "createdAt"> & { createdAt: FieldValue } = {
      hospitalId: params.context.hospitalId,
      actorId: params.context.actorId,
      actorRole: params.context.actorRole,
      action: params.action,
      entityType: params.entityType ?? params.collection,
      entityId: targetRef.id,
      before: params.before ?? null,
      after: params.data,
      createdAt: FieldValue.serverTimestamp(),
    };
    tx.set(auditRef, auditLog);
  });

  return targetRef.id;
}
