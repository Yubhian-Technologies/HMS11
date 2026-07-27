import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetBedStatusRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * office only, own branch. Admin creates the ward/room/bed catalog (Module
 * 4) and stops there; day-to-day bed condition (available/reserved/
 * cleaning/maintenance) is Office's job alone, as part of running the ward.
 * `assignBedToAdmission` (office or doctor) is the only other path that
 * ever touches bed status, and only ever sets "occupied". Office is
 * single-branch by claim, so `caller.branchId` (not a request field) locates
 * the nested `beds` collection — the request never carried a branchId here.
 */
export const setBedStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, bedId, status } = SetBedStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const branchId = caller.branchId!;
  const snap = await db.collection(branchCollection(hospitalId, branchId, "beds")).doc(bedId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Bed not found.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "beds"),
    docId: bedId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
