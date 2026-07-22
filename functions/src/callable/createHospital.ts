import { onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CreateHospitalRequest, CreateHospitalResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-2.1 + FR-2.2: creating a hospital always creates its default "Main
 * Branch" in the same transaction, so a hospital can never exist without at
 * least one branch. Two audit entries are written (one per entity) so the
 * trail stays granular even though the write is atomic.
 */
export const createHospital = onCall(async (request) => {
  const caller = requireCallerRole(request, ["super_admin"]);
  const input = CreateHospitalRequest.parse(request.data);

  const db = getFirestore();
  const hospitalRef = db.collection("hospitals").doc();
  const branchRef = hospitalRef.collection("branches").doc();

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.set(hospitalRef, {
      name: input.name,
      registrationNumber: input.registrationNumber ?? null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      address: input.address,
      adminUserId: null,
      hospitalId: hospitalRef.id,
      branchId: null,
      status: "active",
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(branchRef, {
      name: "Main Branch",
      address: input.address,
      contactPhone: input.contactPhone,
      timings: [],
      hospitalId: hospitalRef.id,
      branchId: null,
      status: "active",
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    const hospitalAuditRef = db.collection("auditLogs").doc();
    tx.set(hospitalAuditRef, {
      hospitalId: hospitalRef.id,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "hospitals",
      entityId: hospitalRef.id,
      before: null,
      after: { name: input.name, contactEmail: input.contactEmail },
      createdAt: now,
    });

    const branchAuditRef = db.collection("auditLogs").doc();
    tx.set(branchAuditRef, {
      hospitalId: hospitalRef.id,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "hospitals/branches",
      entityId: branchRef.id,
      before: null,
      after: { name: "Main Branch" },
      createdAt: now,
    });
  });

  return CreateHospitalResponse.parse({
    hospitalId: hospitalRef.id,
    mainBranchId: branchRef.id,
  });
});
