import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateDepartmentRequest, CreateDepartmentResponse, hospitalCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-3.2. admin only, own hospital. */
export const createDepartment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateDepartmentRequest.parse(request.data);

  if (caller.hospitalId !== input.hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage departments in your own hospital.");
  }

  const db = getFirestore();
  const departmentId = await writeWithAudit(db, {
    collection: hospitalCollection(input.hospitalId, "departments"),
    data: {
      name: input.name,
      hospitalId: input.hospitalId,
      branchId: null,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateDepartmentResponse.parse({ departmentId });
});
