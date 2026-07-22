import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateHolidayRequest, CreateHolidayResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/** FR-3.4. admin only, own hospital. */
export const createHoliday = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateHolidayRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const holidayId = await writeWithAudit(db, {
    collection: "holidays",
    data: {
      date: input.date,
      reason: input.reason,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateHolidayResponse.parse({ holidayId });
});
