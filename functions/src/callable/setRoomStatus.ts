import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SetRoomStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const setRoomStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const { hospitalId, roomId, status } = SetRoomStatusRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  const db = getFirestore();
  const snap = await db.collection("rooms").doc(roomId).get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) {
    throw new HttpsError("not-found", "Room not found.");
  }

  await writeWithAudit(db, {
    collection: "rooms",
    docId: roomId,
    data: { status },
    action: "statusChange",
    before: snap.data() ?? null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return { success: true };
});
