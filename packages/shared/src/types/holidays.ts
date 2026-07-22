import type { BaseDoc } from "./base";

/** holidays/{id} — per branch. See docs/10-collections-schema.md. */
export interface Holiday extends BaseDoc {
  date: string; // ISO date
  reason: string;
  status: "active" | "disabled";
}
