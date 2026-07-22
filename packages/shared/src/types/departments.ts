import type { BaseDoc } from "./base";

/**
 * departments/{id} — hospital-scoped, not branch-scoped (branchId is always
 * null: a department spans every branch of its hospital). See
 * docs/09-firestore-design.md §9.2 and docs/10-collections-schema.md.
 */
export interface Department extends BaseDoc {
  name: string;
  status: "active" | "disabled";
}
