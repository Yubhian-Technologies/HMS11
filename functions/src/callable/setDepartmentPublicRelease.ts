import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetDepartmentPublicReleaseRequest, branchCollection, doctorCollection, hospitalCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { addDays, todayIso } from "../services/datetime";

/**
 * Office only, own branch — the "release to public" button per department
 * per branch. A department is bookable by a patient at this branch only
 * when this doc exists with `publiclyBookable: true` (see
 * listBookableDepartments) — requiring at least one approved doctor slot.
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

  if (publiclyBookable) {
    const doctorsSnap = await db
      .collection(`hospitals/${hospitalId}/branches/${branchId}/doctors`)
      .where("departmentId", "==", departmentId)
      .where("status", "==", "active")
      .get();

    if (doctorsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot release to public: No active doctors exist in this department.",
      );
    }

    const dates = Array.from({ length: 3 }, (_, i) => addDays(todayIso(), i));
    let hasApprovedSlots = false;

    for (const docSnap of doctorsSnap.docs) {
      for (const date of dates) {
        for (const session of ["morning", "afternoon"] as const) {
          const slotSnap = await db
            .doc(`${doctorCollection(hospitalId, branchId, docSnap.id, "slots")}/${date}_${session}`)
            .get();
          if (slotSnap.exists && slotSnap.data()?.status === "approved") {
            hasApprovedSlots = true;
            break;
          }
        }
        if (hasApprovedSlots) break;
      }
      if (hasApprovedSlots) break;
    }

    if (!hasApprovedSlots) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot release to public: No doctors in this department have approved slots.",
      );
    }
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
