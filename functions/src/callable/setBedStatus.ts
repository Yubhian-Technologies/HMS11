import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetBedStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * office only, own branch. Admin creates the ward/room/bed catalog (Module
 * 4) and stops there; day-to-day bed condition (available/reserved/
 * cleaning/maintenance) is Office's job alone, as part of running the ward.
 * `assignBedToAdmission` (office or doctor) is the only other path that
 * ever touches bed status, and only ever sets "occupied".
 */
export const setBedStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["office"]);
  const { hospitalId, bedId, status } = SetBedStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("beds").doc(bedId).get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Bed not found.");
  }
  if (caller.branchId !== snap.data()?.branchId) {
    throw new HttpsError("permission-denied", "You can only manage beds in your own branch.");
  }

  await writeWithAudit(db, {
    collection: "beds",
    docId: bedId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
