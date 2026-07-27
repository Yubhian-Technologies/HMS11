import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateMedicineInventoryItemRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.6. admin (own hospital) or pharmacy (own branch). */
export const updateMedicineInventoryItem = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "pharmacy"]);
  const { hospitalId, branchId, itemId, ...fields } = UpdateMedicineInventoryItemRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.role === "pharmacy" && caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only manage inventory for your own branch.");
  }

  const db = getFirestore();
  const snap = await db.collection(branchCollection(hospitalId, branchId, "medicineInventory")).doc(itemId).get();
  const item = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Inventory item not found.");
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "medicineInventory"),
    docId: itemId,
    data: updates,
    action: "update",
    before: item ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
