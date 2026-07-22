import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetWardStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const setWardStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, wardId, status } = SetWardStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("wards").doc(wardId).get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Ward not found.");
  }

  await writeWithAudit(db, {
    collection: "wards",
    docId: wardId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
