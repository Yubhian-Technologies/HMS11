import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateMedicineInventoryItemRequest, CreateMedicineInventoryItemResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/**
 * FR-3.6. admin (own hospital) or pharmacy (own branch — restocking, wired
 * from Module 11 onward) per docs/08-permission-matrix.md.
 */
export const createMedicineInventoryItem = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "pharmacy"]);
  const input = CreateMedicineInventoryItemRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.role === "pharmacy" && caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only manage inventory for your own branch.");
  }

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const itemId = await writeWithAudit(db, {
    collection: "medicineInventory",
    data: {
      name: input.name,
      batchNumber: input.batchNumber,
      expiryDate: input.expiryDate,
      quantityInStock: input.quantityInStock,
      reorderLevel: input.reorderLevel,
      unitPrice: input.unitPrice,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateMedicineInventoryItemResponse.parse({ itemId });
});
