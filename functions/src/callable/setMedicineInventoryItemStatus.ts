import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetMedicineInventoryItemStatusRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.6. admin only — disabling a catalog item is not a pharmacy action. */
export const setMedicineInventoryItemStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, branchId, itemId, status } = SetMedicineInventoryItemStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection(branchCollection(hospitalId, branchId, "medicineInventory")).doc(itemId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Inventory item not found.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "medicineInventory"),
    docId: itemId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
