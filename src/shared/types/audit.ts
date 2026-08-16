import type { Timestamp } from "./base";

/**
 * auditLogs/{id} — append-only, no BaseDoc inheritance (distinct shape).
 * See docs/10-collections-schema.md and docs/02-missing-features.md §8.
 *
 * "delete" is a narrow, deliberate exception to NFR-7.1 ("no hard deletes
 * anywhere") — holidays are the one entity that supports a true delete
 * (deleteHoliday), since they're a non-clinical scheduling record with no
 * audit-sensitivity requirement. `after` is null for a delete entry.
 */
export interface AuditLog {
  hospitalId: string; // "platform" for super_admin-scoped actions
  actorId: string;
  actorRole: string;
  action: "create" | "update" | "statusChange" | "delete";
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: Timestamp;
}
