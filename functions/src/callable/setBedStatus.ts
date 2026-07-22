import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetBedStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-3.5. admin only, own hospital. Admin toggles among all five states here
 * in Module 4 (mainly available/cleaning/maintenance); Module 12
 * (Admissions) is what actually drives occupied/reserved during real
 * patient flow, via its own service — not this callable.
 */
export const setBedStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, bedId, status } = SetBedStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("beds").doc(bedId).get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Bed not found.");
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
