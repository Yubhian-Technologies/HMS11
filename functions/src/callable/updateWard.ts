import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateWardRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const updateWard = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, wardId, building, floor, name } = UpdateWardRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const ref = db.collection("wards").doc(wardId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Ward not found.");
  }

  await writeWithAudit(db, {
    collection: "wards",
    docId: wardId,
    data: { building, floor, name },
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
