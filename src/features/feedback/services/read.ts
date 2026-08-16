import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Feedback } from "@hms/shared";

export type FeedbackRecord = Feedback & { id: string };

/** `feedback` is branch-nested now — a patient's own feedback spans every hospital/branch they've visited. */
export async function listFeedbackByPatient(patientId: string): Promise<FeedbackRecord[]> {
  const snap = await getAdminDb().collectionGroup("feedback").where("patientId", "==", patientId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Feedback) }));
}

/** Admin's hospital-wide complaint list spans every branch — one collectionGroup scan. */
export async function listComplaints(hospitalId: string): Promise<FeedbackRecord[]> {
  const snap = await getAdminDb()
    .collectionGroup("feedback")
    .where("hospitalId", "==", hospitalId)
    .where("isComplaint", "==", true)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Feedback) }));
}
