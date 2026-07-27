import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateWardRequest, CreateWardResponse, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const createWard = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateWardRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const wardId = await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "wards"),
    data: {
      building: input.building,
      floor: input.floor,
      name: input.name,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateWardResponse.parse({ wardId });
});
