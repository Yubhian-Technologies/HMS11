import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Feedback } from "@hms/shared";

export type FeedbackRecord = Feedback & { id: string };

export async function listFeedbackByPatient(patientId: string): Promise<FeedbackRecord[]> {
  const snap = await getAdminDb().collection("feedback").where("patientId", "==", patientId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Feedback) }));
}

export async function listComplaints(hospitalId: string): Promise<FeedbackRecord[]> {
  const snap = await getAdminDb()
    .collection("feedback")
    .where("hospitalId", "==", hospitalId)
    .where("isComplaint", "==", true)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Feedback) }));
}
