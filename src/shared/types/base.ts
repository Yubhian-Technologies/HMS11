/**
 * Structural type satisfied by both the client SDK's `firebase/firestore`
 * Timestamp and the Admin SDK's `firebase-admin/firestore` Timestamp, so
 * this package never has to depend on either SDK directly.
 */
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

/**
 * Fields present on every Firestore document in the system.
 * See docs/09-firestore-design.md §9.2 and docs/10-collections-schema.md.
 */
export interface BaseDoc {
  hospitalId: string;
  branchId: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
