import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateBranchRequest, CreateBranchResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-2.3. super_admin, or admin scoped to their own hospital
 * (docs/08-permission-matrix.md "Branches" row).
 */
export const createBranch = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin", "admin"]);
  const input = CreateBranchRequest.parse(request.data);

  if (caller.role === "admin" && caller.hospitalId !== input.hospitalId) {
    throw new HttpsError("permission-denied", "You can only add branches to your own hospital.");
  }

  const db = getFirestore();
  const hospitalSnap = await db.collection("hospitals").doc(input.hospitalId).get();
  if (!hospitalSnap.exists) {
    throw new HttpsError("not-found", "Hospital not found.");
  }

  const branchId = await writeWithAudit(db, {
    collection: `hospitals/${input.hospitalId}/branches`,
    data: {
      name: input.name,
      address: input.address,
      contactPhone: input.contactPhone,
      timings: [] as unknown[],
      hospitalId: input.hospitalId,
      branchId: null,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateBranchResponse.parse({ branchId });
});
