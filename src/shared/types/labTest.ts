import type { BaseDoc } from "./base";

/** labTestMaster/{id} — per branch. See docs/10-collections-schema.md. */
export interface LabTestMasterItem extends BaseDoc {
  name: string;
  category: string;
  price: number;
  sampleType: string;
  status: "active" | "disabled";
}
