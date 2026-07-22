import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateLabTestRequest, CreateLabTestResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/** FR-3.6. admin only, own hospital. */
export const createLabTest = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateLabTestRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const testId = await writeWithAudit(db, {
    collection: "labTestMaster",
    data: {
      name: input.name,
      category: input.category,
      price: input.price,
      sampleType: input.sampleType,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateLabTestResponse.parse({ testId });
});
