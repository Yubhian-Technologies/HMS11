import type { BaseDoc } from "./base";

export type NotificationType =
  | "appointmentConfirmation"
  | "appointmentReminder"
  | "medicineReminder"
  | "labReportReady"
  | "prescriptionReady"
  | "followUpReminder"
  | "emergencyUpdate";

/**
 * notifications/{id}. hospitalId is nullable — a notification follows its
 * recipient (patient notifications are never hospital-bound; even staff
 * notifications are addressed by userId, so the hospital scope isn't load-
 * bearing for access control here, only for record-keeping where known).
 */
export interface Notification extends Omit<BaseDoc, "hospitalId"> {
  hospitalId: string | null;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  relatedEntityId: string | null;
}
