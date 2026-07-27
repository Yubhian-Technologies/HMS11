import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateBedRequest, CreateBedResponse, branchCollection } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-3.5. admin only, own hospital. New beds start "available". */
export const createBed = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateBedRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  const db = getFirestore();
  const roomSnap = await db
    .collection(branchCollection(input.hospitalId, input.branchId, "rooms"))
    .doc(input.roomId)
    .get();
  if (!roomSnap.exists) {
    throw new HttpsError("not-found", "Room not found in this hospital.");
  }

  const bedId = await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "beds"),
    data: {
      roomId: input.roomId,
      wardId: roomSnap.data()?.wardId, // denormalized — docs/10-collections-schema.md
      bedNumber: input.bedNumber,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "available",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateBedResponse.parse({ bedId });
});
