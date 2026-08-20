import type { Role } from "./roles";

/**
 * Entity-based operation permissions — the fine-grained counterpart to
 * PERMISSION_MATRIX. Each operation is one entity + action pair and maps to
 * the roles permitted to perform it. Callables gate on these via
 * requireOperation() instead of hardcoding role lists, so granting a new
 * role (e.g. letting the Nurse record vitals too) is a one-line change here
 * and nowhere else.
 *
 * Where PERMISSION_MATRIX answers "which roles may act on module X at all",
 * this registry answers "which roles may perform this specific operation" —
 * the two stay in sync but this one is what the code enforces.
 *
 * Multi-entity callables (e.g. submitConsultation, which creates
 * prescriptions + labOrders + admissions in one transaction) keep their
 * requireCallerRole([...]) gate because no single operation captures them.
 */
export type OperationName =
  | "appointment.checkIn"
  | "vitals.record"
  | "labOrder.create"
  | "labOrder.collectPayment"
  | "labOrder.advanceStatus"
  | "labOrder.uploadReport";

export const OPERATION_PERMISSIONS: Record<OperationName, Role[]> = {
  "appointment.checkIn": ["reception"],
  "vitals.record": ["reception", "nurse"],
  "labOrder.create": ["doctor"],
  "labOrder.collectPayment": ["office"],
  "labOrder.advanceStatus": ["lab"],
  "labOrder.uploadReport": ["lab"],
};

export function canOperate(role: Role, operation: OperationName): boolean {
  return OPERATION_PERMISSIONS[operation].includes(role);
}