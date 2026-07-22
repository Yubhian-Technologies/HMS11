import type { BaseDoc, Timestamp } from "./base";

/**
 * availabilityRequests/{id} — Office asks a doctor to confirm capacity for a
 * date (e.g. "40 morning / 30 afternoon"); the doctor responds with the real
 * counts they can cover and an overall yes/no.
 */
export interface AvailabilityRequest extends BaseDoc {
  doctorId: string;
  date: string; // ISO date
  morningRequested: number;
  afternoonRequested: number;
  status: "pending" | "responded";
  morningAvailable: number | null;
  afternoonAvailable: number | null;
  isAvailable: boolean | null;
  respondedAt: Timestamp | null;
}
