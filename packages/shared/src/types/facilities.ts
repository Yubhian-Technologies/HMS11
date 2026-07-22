import type { BaseDoc } from "./base";

/** wards/{id} — per branch. See docs/10-collections-schema.md. */
export interface Ward extends BaseDoc {
  building: string;
  floor: string;
  name: string;
  status: "active" | "disabled";
}

/** rooms/{id}. See docs/10-collections-schema.md. */
export interface Room extends BaseDoc {
  wardId: string;
  roomNumber: string;
  status: "active" | "disabled";
}

/**
 * beds/{id}. `wardId` is denormalized from the room for direct
 * bed-availability queries — docs/10-collections-schema.md.
 */
export interface Bed extends BaseDoc {
  roomId: string;
  wardId: string;
  bedNumber: string;
  status: "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
}
