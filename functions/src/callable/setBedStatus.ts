import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetBedStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * admin or office, own hospital/branch. Admin manages the catalog end to
 * end (Module 4); Office additionally manages day-to-day bed status
 * (available/cleaning/maintenance) as part of running the ward, per the
 * Rooms & Beds admin-creates/office-manages split. `assignBedToAdmission`
 * is the only path that ever sets "occupied" — not this callable.
 */
export const setBedStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin", "office"]);
  const { hospitalId, bedId, status } = SetBedStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("beds").doc(bedId).get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Bed not found.");
  }
  if (caller.role === "office" && caller.branchId !== snap.data()?.branchId) {
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
