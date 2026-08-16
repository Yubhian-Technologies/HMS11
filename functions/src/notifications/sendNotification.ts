import { getMessaging } from "firebase-admin/messaging";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

export type NotificationType =
  | "appointmentConfirmation"
  | "appointmentReminder"
  | "medicineReminder"
  | "labReportReady"
  | "prescriptionReady"
  | "followUpReminder"
  | "emergencyUpdate"
  | "medicineExpiryAlert"
  | "slotProposal";

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  hospitalId?: string | null;
  relatedEntityId?: string | null;
}

/**
 * FR-16.1 / FR-16.2 / NFR-9.1. Single FCM implementation behind this
 * abstraction — swapping/adding a provider (SMS/WhatsApp, per docs/02-
 * missing-features.md §10) later means changing this file only, not every
 * call site. Always writes the in-app notification record first (FR-16.2 —
 * this is the one guarantee); the push itself is best-effort and never
 * throws back to the caller (NFR-2.3 — a failed push must never roll back
 * the business write that triggered it).
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const db = getFirestore();

  await db.collection("notifications").add({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    read: false,
    relatedEntityId: params.relatedEntityId ?? null,
    hospitalId: params.hospitalId ?? null,
    branchId: null,
    createdBy: "system",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    status: "active",
  });

  try {
    const userSnap = await db.collection("users").doc(params.userId).get();
    const tokens = (userSnap.data()?.fcmTokens as string[] | undefined) ?? [];
    if (tokens.length === 0) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: params.title, body: params.body },
      data: { type: params.type, relatedEntityId: params.relatedEntityId ?? "" },
    });
  } catch (err) {
    logger.warn("sendNotification: FCM push failed, in-app record still written", {
      userId: params.userId,
      type: params.type,
      error: String(err),
    });
  }
}
