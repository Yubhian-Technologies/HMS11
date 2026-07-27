import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdateRoomRequest, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const updateRoom = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, branchId, roomId, roomNumber, dailyRate } = UpdateRoomRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const ref = db.collection(branchCollection(hospitalId, branchId, "rooms")).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Room not found.");
  }

  await writeWithAudit(db, {
    collection: branchCollection(hospitalId, branchId, "rooms"),
    docId: roomId,
    data: { roomNumber, dailyRate },
    action: "update",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
