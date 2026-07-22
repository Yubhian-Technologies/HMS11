import type { Timestamp } from "./base";

/**
 * auditLogs/{id} — append-only, no BaseDoc inheritance (distinct shape).
 * See docs/10-collections-schema.md and docs/02-missing-features.md §8.
 */
export interface AuditLog {
  hospitalId: string; // "platform" for super_admin-scoped actions
  actorId: string;
  actorRole: string;
  action: "create" | "update" | "statusChange";
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: Timestamp;
}
