import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { AssignHospitalAdminRequest, AssignHospitalAdminResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { createAuthUserOrThrow } from "../services/auth-errors";

/**
 * FR-2.4. super_admin only — admin accounts are never self-provisioned or
 * created by any other role (docs/07-user-roles.md §7.2). Reassigning an
 * already-admin'd hospital disables the previous admin's account: a
 * hospital has exactly one active admin at a time (hospitals.adminUserId is
 * a single field, not a list).
 */
export const assignHospitalAdmin = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin"]);
  const input = AssignHospitalAdminRequest.parse(request.data);

  const db = getFirestore();
  const auth = getAuth();
  const hospitalRef = db.collection("hospitals").doc(input.hospitalId);
  const hospitalSnap = await hospitalRef.get();
  if (!hospitalSnap.exists) {
    throw new HttpsError("not-found", "Hospital not found.");
  }

  const previousAdminUserId = (hospitalSnap.data()?.adminUserId as string | null) ?? null;

  const userRecord = await createAuthUserOrThrow({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.set(db.collection("users").doc(userRecord.uid), {
      role: "admin",
      name: input.name,
      email: input.email,
      phone: input.phone,
      fcmTokens: [],
      status: "active",
      hospitalId: input.hospitalId,
      branchId: null,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    tx.update(hospitalRef, { adminUserId: userRecord.uid, updatedAt: now });

    if (previousAdminUserId) {
      tx.update(db.collection("users").doc(previousAdminUserId), {
        status: "disabled",
        updatedAt: now,
      });
    }

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "update",
      entityType: "hospitals",
      entityId: input.hospitalId,
      before: { adminUserId: previousAdminUserId },
      after: { adminUserId: userRecord.uid },
      createdAt: now,
    });
  });

  // Belt-and-suspenders alongside the onUserStatusChange trigger, which
  // fires from the same write above but may run slightly after this
  // function returns — the previous admin's sessions should die immediately.
  if (previousAdminUserId) {
    await auth.revokeRefreshTokens(previousAdminUserId).catch(() => undefined);
  }

  return AssignHospitalAdminResponse.parse({ uid: userRecord.uid });
});
