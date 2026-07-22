import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateStaffAccountRequest, CreateStaffAccountResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { createAuthUserOrThrow } from "../services/auth-errors";

/**
 * FR-3.1. admin only, own hospital. Covers office/reception/pharmacy/lab —
 * doctor has its own `createDoctorAccount` (extra clinical fields).
 */
export const createStaffAccount = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateStaffAccountRequest.parse(request.data);

  if (caller.hospitalId !== input.hospitalId) {
    throw new HttpsError("permission-denied", "You can only create staff for your own hospital.");
  }

  const db = getFirestore();
  const branchSnap = await db
    .collection(`hospitals/${input.hospitalId}/branches`)
    .doc(input.branchId)
    .get();
  if (!branchSnap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }

  const userRecord = await createAuthUserOrThrow({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await writeWithAudit(db, {
    collection: "users",
    docId: userRecord.uid,
    data: {
      role: input.role,
      name: input.name,
      email: input.email,
      phone: input.phone,
      fcmTokens: [],
      status: "active",
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateStaffAccountResponse.parse({ uid: userRecord.uid });
});
