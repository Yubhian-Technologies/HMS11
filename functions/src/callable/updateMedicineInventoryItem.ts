import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateMedicineInventoryItemRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.6. admin (own hospital) or pharmacy (own branch). */
export const updateMedicineInventoryItem = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "pharmacy"]);
  const { hospitalId, itemId, ...fields } = UpdateMedicineInventoryItemRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("medicineInventory").doc(itemId).get();
  const item = snap.data();
  if (!snap.exists || item?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Inventory item not found.");
  }
  if (caller.role === "pharmacy" && caller.branchId !== item?.branchId) {
    throw new HttpsError("permission-denied", "You can only manage inventory for your own branch.");
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: "medicineInventory",
    docId: itemId,
    data: updates,
    action: "update",
    before: item ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
