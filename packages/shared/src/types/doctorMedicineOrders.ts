import type { BaseDoc } from "./base";

export interface DoctorMedicineOrderItem {
  medicineInventoryId: string;
  medicineName: string;
  durationDays: number;
}

/**
 * doctorMedicineOrders/{id} — the doctor's standalone medicine assignment
 * module. Deliberately separate from prescriptions/{id} (Module 9's
 * consult-flow prescription, which requires dosage/frequency up front): here
 * the doctor only names the medicine and duration — dosage/timing is added
 * later by Pharmacy, outside this module's scope.
 */
export interface DoctorMedicineOrder extends BaseDoc {
  patientId: string;
  doctorId: string;
  items: DoctorMedicineOrderItem[];
}
