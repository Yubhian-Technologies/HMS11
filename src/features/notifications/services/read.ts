import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Notification } from "@hms/shared";

export type NotificationRecord = Notification & { id: string };

export async function listNotifications(userId: string): Promise<NotificationRecord[]> {
  const snap = await getAdminDb()
    .collection("notifications")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Notification) }));
}
