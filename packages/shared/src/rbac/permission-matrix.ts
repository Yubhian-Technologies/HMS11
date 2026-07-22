import type { Role } from "./roles";

/**
 * The authoritative role x module x action grid. Human-readable mirror lives at
 * docs/08-permission-matrix.md — if they ever disagree, THIS FILE is authoritative
 * and the doc should be updated to match.
 *
 * "statusChange" is a deliberately restricted subset of "update" for high-stakes
 * state transitions (approve/reject/disable) — see docs/08-permission-matrix.md
 * "Notes". Action permission is necessary but not sufficient: every check must
 * also be combined with the scope check from ./roles.ts (ROLE_SCOPE) and
 * ./scope.ts, which determines *which* documents a role may act on.
 */
export type Action = "create" | "read" | "update" | "statusChange";

export type ModuleName =
  | "hospitals"
  | "branches"
  | "staffAccounts"
  | "departments"
  | "hospitalSettings"
  | "roomsWardsBeds"
  | "labTestMaster"
  | "medicineInventory"
  | "doctorAvailabilityTemplates"
  | "doctorSlots"
  | "availabilityRequests"
  | "doctorMedicineOrders"
  | "patients"
  | "appointments"
  | "emergencyQueue"
  | "vitals"
  | "consultations"
  | "prescriptions"
  | "labOrders"
  | "labReports"
  | "medicineDispenses"
  | "medicineLogs"
  | "healthUpdates"
  | "admissions"
  | "followUps"
  | "medicalCertificates"
  | "referrals"
  | "invoices"
  | "notifications"
  | "feedback"
  | "auditLogs"
  | "analytics";

type ModulePermissions = Partial<Record<Role, Action[]>>;

const CRUS: Action[] = ["create", "read", "update", "statusChange"];
const CRU: Action[] = ["create", "read", "update"];
const RU: Action[] = ["read", "update"];
const R: Action[] = ["read"];
const CR: Action[] = ["create", "read"];

export const PERMISSION_MATRIX: Record<ModuleName, ModulePermissions> = {
  hospitals: { super_admin: CRUS, admin: R },
  branches: { super_admin: CRUS, admin: CRUS, office: R, reception: R, doctor: R, pharmacy: R, lab: R },
  staffAccounts: { super_admin: R, admin: CRUS, office: R, reception: R, doctor: R, pharmacy: R, lab: R },
  departments: { super_admin: R, admin: CRUS, office: R, reception: R, doctor: R, patient: R },
  hospitalSettings: { super_admin: R, admin: CRU, office: R, reception: R, doctor: R, patient: R },
  roomsWardsBeds: { super_admin: R, admin: CRUS, office: RU, reception: R, doctor: R },
  labTestMaster: { super_admin: R, admin: CRUS, doctor: R, lab: R, patient: R },
  medicineInventory: { super_admin: R, admin: CRUS, pharmacy: CRU },
  doctorAvailabilityTemplates: { super_admin: R, admin: CRU, office: R, reception: R, doctor: CRU },
  doctorSlots: { super_admin: R, admin: R, office: ["read", "statusChange"], reception: R, doctor: ["statusChange"], patient: R },
  availabilityRequests: { super_admin: R, admin: R, office: CR, doctor: RU },
  doctorMedicineOrders: { super_admin: R, admin: R, doctor: CR, pharmacy: R },
  patients: { super_admin: R, admin: R, office: R, reception: CRU, doctor: R, pharmacy: R, lab: R, patient: CRU },
  appointments: { super_admin: R, admin: R, office: CRUS, reception: CRU, doctor: RU, patient: CR },
  emergencyQueue: { super_admin: R, admin: R, office: CRU, reception: CRU, doctor: RU },
  vitals: { super_admin: R, admin: R, reception: CR, doctor: R, patient: R },
  consultations: { super_admin: R, admin: R, doctor: CRU, patient: R },
  prescriptions: { super_admin: R, admin: R, doctor: CR, pharmacy: RU, patient: R },
  labOrders: {
    super_admin: R,
    admin: R,
    doctor: CR,
    lab: ["read", "update", "statusChange"],
    office: ["read", "update"],
    patient: R,
  },
  labReports: { super_admin: R, admin: R, doctor: R, lab: CR, patient: R },
  medicineDispenses: { super_admin: R, admin: R, pharmacy: CRU, patient: R },
  medicineLogs: { super_admin: R, admin: R, doctor: R, patient: CRU },
  healthUpdates: { super_admin: R, admin: R, doctor: R, patient: CR },
  admissions: { super_admin: R, admin: R, office: RU, reception: R, doctor: CRUS, patient: R },
  followUps: { super_admin: R, admin: R, office: R, reception: R, doctor: CRU, patient: R },
  medicalCertificates: { super_admin: R, admin: R, doctor: CR, patient: R },
  referrals: { super_admin: R, admin: R, doctor: CR, patient: R },
  invoices: { super_admin: R, admin: RU, reception: RU, patient: R },
  notifications: {
    super_admin: R, admin: R, office: R, reception: R, doctor: R, pharmacy: R, lab: R, patient: R,
  },
  feedback: { super_admin: R, admin: RU, doctor: R, patient: CR },
  auditLogs: { super_admin: R, admin: R },
  analytics: { super_admin: R, admin: R },
};

export function can(role: Role, moduleName: ModuleName, action: Action): boolean {
  return PERMISSION_MATRIX[moduleName][role]?.includes(action) ?? false;
}
