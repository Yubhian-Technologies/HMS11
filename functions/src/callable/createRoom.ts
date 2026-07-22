import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateRoomRequest, CreateRoomResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. */
export const createRoom = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateRoomRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  const wardSnap = await db.collection("wards").doc(input.wardId).get();
  if (!wardSnap.exists || wardSnap.data()?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Ward not found in this hospital.");
  }

  const roomId = await writeWithAudit(db, {
    collection: "rooms",
    data: {
      wardId: input.wardId,
      roomNumber: input.roomNumber,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateRoomResponse.parse({ roomId });
});
