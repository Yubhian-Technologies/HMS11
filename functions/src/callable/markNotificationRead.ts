import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { MarkNotificationReadRequest, PHASE_1_ACTIVE_ROLES } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-16.2. Any authenticated role, own notification only. */
export const markNotificationRead = onCall(async (request) => {
  const caller = requireCallerRole(request, PHASE_1_ACTIVE_ROLES);
  const { notificationId } = MarkNotificationReadRequest.parse(request.data);

  const db = getFirestore();
  const snap = await db.collection("notifications").doc(notificationId).get();
  const notification = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Notification not found.");
  }
  if (notification?.userId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only mark your own notifications read.");
  }

  await writeWithAudit(db, {
    collection: "notifications",
    docId: notificationId,
    data: { read: true },
    action: "update",
    before: notification,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: notification.hospitalId ?? "platform" },
  });

  return { success: true };
});
