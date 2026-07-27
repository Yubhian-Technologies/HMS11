import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { sendNotification } from "../notifications/sendNotification";

const EXPIRY_WARNING_DAYS = 30;
const MS_PER_DAY = 86_400_000;

/**
 * Pharmacy expiry alert. Runs once daily — deliberately re-notifies every
 * day for as long as an item stays within the warning window (or expired),
 * unlike dispatchMedicineReminders' one-shot "reminderSentAt" guard: this is
 * a standing alert meant to keep nagging until the item is restocked or
 * disabled, not a single ping (per the user's "expiry alert should come
 * everyday" request).
 *
 * `medicineInventory` is nested per branch now — this scan runs across
 * every hospital/branch, so it uses `collectionGroup()`.
 */
export const dispatchExpiryAlerts = onSchedule("every day 07:00", async () => {
  const db = getFirestore();
  const now = Date.now();

  // Single equality filter — no composite index needed. Filtering the
  // expiry window itself happens in memory rather than as a second `where`,
  // so this never needs a (status, expiryDate) composite index either.
  const snap = await db.collectionGroup("medicineInventory").where("status", "==", "active").get();
  const nearExpiry = snap.docs.filter((doc) => {
    const expiryDate = doc.data().expiryDate as string;
    return (new Date(expiryDate).getTime() - now) / MS_PER_DAY <= EXPIRY_WARNING_DAYS;
  });
  if (nearExpiry.length === 0) return;

  const branchPairs = Array.from(
    new Map(
      nearExpiry.map((doc) => {
        const data = doc.data();
        const key = `${data.hospitalId}::${data.branchId}`;
        return [key, { hospitalId: data.hospitalId as string, branchId: data.branchId as string }];
      }),
    ).values(),
  );

  // (hospitalId, branchId, role) matches the existing users composite index
  // (hospitalId, branchId, role, createdAt) as a prefix — no new index.
  const pharmacyUserIdsByBranch = new Map<string, string[]>();
  await Promise.all(
    branchPairs.map(async ({ hospitalId, branchId }) => {
      const usersSnap = await db
        .collection("users")
        .where("hospitalId", "==", hospitalId)
        .where("branchId", "==", branchId)
        .where("role", "==", "pharmacy")
        .get();
      pharmacyUserIdsByBranch.set(branchId, usersSnap.docs.map((d) => d.id));
    }),
  );

  await Promise.all(
    nearExpiry.map(async (doc) => {
      const item = doc.data();
      const pharmacyUserIds = pharmacyUserIdsByBranch.get(item.branchId as string) ?? [];
      const daysUntilExpiry = Math.ceil((new Date(item.expiryDate as string).getTime() - now) / MS_PER_DAY);
      const expired = daysUntilExpiry < 0;
      const body = expired
        ? `${item.name} (batch ${item.batchNumber}) expired ${Math.abs(daysUntilExpiry)} day(s) ago.`
        : `${item.name} (batch ${item.batchNumber}) expires in ${daysUntilExpiry} day(s).`;

      await Promise.all(
        pharmacyUserIds.map((userId) =>
          sendNotification({
            userId,
            type: "medicineExpiryAlert",
            title: expired ? "Medicine expired" : "Medicine expiring soon",
            body,
            hospitalId: item.hospitalId as string,
            relatedEntityId: doc.id,
          }),
        ),
      );
    }),
  );
});
