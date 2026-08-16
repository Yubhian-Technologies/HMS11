import type { BaseDoc, Timestamp } from "./base";

/**
 * medicineDispenses/{id}. `medicineInventoryItemId` and `unitPriceAtDispense`
 * are captured at dispense time (not looked up later) so Module 15 billing
 * can compute the pharmacy line item without re-deriving a price that may
 * have since changed in the catalog.
 */
export interface MedicineDispense extends BaseDoc {
  prescriptionId: string;
  prescriptionItemIndex: number;
  patientId: string;
  dispensedBy: string;
  quantityDispensed: number;
  medicineInventoryItemId: string;
  unitPriceAtDispense: number;
}

/**
 * medicineLogs/{id}. One entry per day of the course, not per
 * within-day dose — `frequency` on a prescription item is free text (e.g.
 * "twice daily", "1-0-1"), not a structured schedule, so dispensing
 * generates a daily reminder rather than guessing exact dose times from
 * that string. The patient marks each entry taken/missed/skipped in
 * Module 14.
 */
export interface MedicineLog extends BaseDoc {
  patientId: string;
  prescriptionId: string;
  prescriptionItemIndex: number;
  scheduledAt: Timestamp;
  patientStatus: "pending" | "taken" | "missed" | "skipped";
  /** Set once dispatchMedicineReminders notifies for this entry — the idempotency guard (NFR-2.2) so a re-run never double-sends. */
  reminderSentAt: Timestamp | null;
}
