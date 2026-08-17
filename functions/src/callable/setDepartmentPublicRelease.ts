import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetDepartmentPublicReleaseRequest, branchCollection, hospitalCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Office only, own branch — the "release to public" button per department
 * per branch. A department is bookable by a patient at this branch only
 * when this doc exists with `publiclyBookable: true` (see
 * listBookableDepartments) — independent of individual doctor slot
 * approval, so Office can hold a department back from public view even
 * after doctors have confirmed their capacity for the day.
 */
export const setDepartmentPublicRelease = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, branchId, departmentId, publiclyBookable } = SetDepartmentPublicReleaseRequest.parse(
    request.data,
  );
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only release departments in your own branch.");
  }

  const db = getFirestore();
  const deptSnap = await db.collection(hospitalCollection(hospitalId, "departments")).doc(departmentId).get();
  if (!deptSnap.exists) {
    throw new HttpsError("not-found", "Department not found.");
  }

  const collection = branchCollection(hospitalId, branchId, "departmentReleases");
  const existing = await db.collection(collection).doc(departmentId).get();

  await writeWithAudit(db, {
    collection,
    docId: departmentId,
    data: {
      departmentId,
      publiclyBookable,
      hospitalId,
      branchId,
      createdBy: caller.uid,
      status: "active",
    },
    action: existing.exists ? "update" : "create",
    before: existing.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
