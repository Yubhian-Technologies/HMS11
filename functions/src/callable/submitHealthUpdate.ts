import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SubmitHealthUpdateRequest, SubmitHealthUpdateResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-14.2. patient only, own — no hospital binding. */
export const submitHealthUpdate = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient"]);
  const input = SubmitHealthUpdateRequest.parse(request.data);

  const db = getFirestore();
  const healthUpdateId = await writeWithAudit(db, {
    collection: "healthUpdates",
    data: {
      patientId: caller.uid,
      condition: input.condition,
      painLevel: input.painLevel,
      sugarMgDl: input.sugarMgDl ?? null,
      bloodPressure: input.bloodPressure ?? null,
      temperatureC: input.temperatureC ?? null,
      weightKg: input.weightKg ?? null,
      hospitalId: null,
      branchId: null,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: "platform" },
  });

  return SubmitHealthUpdateResponse.parse({ healthUpdateId });
});
