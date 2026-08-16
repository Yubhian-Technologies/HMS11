import type { BaseDoc } from "./base";

/** labReports/{id}. `fileUrl` is a Storage download URL under /labReports/{hospitalId}/{patientId}/. */
export interface LabReport extends BaseDoc {
  labOrderId: string;
  patientId: string;
  fileUrl: string;
  verifiedBy: string;
  summaryNotes?: string;
}
