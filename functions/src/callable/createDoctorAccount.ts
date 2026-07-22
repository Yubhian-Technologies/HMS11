import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CreateDoctorAccountRequest, CreateDoctorAccountResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { createAuthUserOrThrow } from "../services/auth-errors";

/**
 * FR-3.1 + FR-3.2 + FR-3.3. admin only, own hospital. Writes users/{uid} and
 * doctorProfiles/{uid} atomically (1:1, same id) — hand-rolled transaction
 * rather than writeWithAudit (which handles one document per call) so both
 * writes and their audit entries commit together, mirroring
 * functions/src/callable/createHospital.ts.
 */
export const createDoctorAccount = onCall(async (request) => {
  const caller = requireCallerRole(request, ["admin"]);
  const input = CreateDoctorAccountRequest.parse(request.data);

  if (caller.hospitalId !== input.hospitalId) {
    throw new HttpsError("permission-denied", "You can only create staff for your own hospital.");
  }

  const db = getFirestore();
  const [branchSnap, departmentSnap] = await Promise.all([
    db.collection(`hospitals/${input.hospitalId}/branches`).doc(input.branchId).get(),
    db.collection("departments").doc(input.departmentId).get(),
  ]);
  if (!branchSnap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }
  if (!departmentSnap.exists || departmentSnap.data()?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Department not found in this hospital.");
  }

  const userRecord = await createAuthUserOrThrow({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.set(db.collection("users").doc(userRecord.uid), {
      role: "doctor",
      name: input.name,
      email: input.email,
      phone: input.phone,
      fcmTokens: [],
      status: "active",
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(db.collection("doctorProfiles").doc(userRecord.uid), {
      departmentId: input.departmentId,
      specialization: input.specialization,
      qualifications: input.qualifications,
      consultationFee: input.consultationFee,
      status: "active",
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    const userAuditRef = db.collection("auditLogs").doc();
    tx.set(userAuditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "users",
      entityId: userRecord.uid,
      before: null,
      after: { role: "doctor", name: input.name },
      createdAt: now,
    });

    const profileAuditRef = db.collection("auditLogs").doc();
    tx.set(profileAuditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "doctorProfiles",
      entityId: userRecord.uid,
      before: null,
      after: { departmentId: input.departmentId, specialization: input.specialization },
      createdAt: now,
    });
  });

  return CreateDoctorAccountResponse.parse({ uid: userRecord.uid });
});
