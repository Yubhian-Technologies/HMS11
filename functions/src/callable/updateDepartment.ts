import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateDepartmentRequest, hospitalCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-3.2. admin only, own hospital. */
export const updateDepartment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, departmentId, name } = UpdateDepartmentRequest.parse(request.data);

  if (caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage departments in your own hospital.");
  }

  const db = getFirestore();
  const ref = db.collection(hospitalCollection(hospitalId, "departments")).doc(departmentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Department not found.");
  }

  await writeWithAudit(db, {
    collection: hospitalCollection(hospitalId, "departments"),
    docId: departmentId,
    data: { name },
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
