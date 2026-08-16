import type { BaseDoc } from "./base";

/**
 * feedback/{id}. FR-17.1/17.2. Non-complaint feedback has nothing to route,
 * so submitFeedback sets `status: "resolved"` for it immediately — only
 * `isComplaint: true` entries actually move through open -> acknowledged ->
 * resolved (docs/13-cloud-functions.md resolveFeedback).
 */
export interface Feedback extends BaseDoc {
  appointmentId: string;
  patientId: string;
  rating: number;
  comment: string;
  isComplaint: boolean;
  status: "open" | "acknowledged" | "resolved";
}
