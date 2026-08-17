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

/**
 * hospitals/{h}/branches/{b}/departmentReleases/{departmentId} — Office's
 * per-branch "release to public" gate for a department. Doc id ==
 * departmentId (one release record per department per branch, upserted).
 * A department is bookable by a patient at a given branch only when this
 * exists with `publiclyBookable: true` — independent of whether any
 * individual doctor slot pool is `approved`, so Office can hold a whole
 * department back from public booking even after doctors have confirmed
 * capacity (e.g. to finish reviewing the day's roster first).
 */
export interface DepartmentRelease extends BaseDoc {
  departmentId: string;
  publiclyBookable: boolean;
}
