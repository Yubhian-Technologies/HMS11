import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateWalkInPatientRequest, CreateWalkInPatientResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital, assertBranchExists } from "../services/scope-checks";

/**
 * FR-5.2. reception only, own branch. No Auth account is created — the
 * record has `userId: null` until (if ever) the patient later self-
 * registers and the two are linked (not built in this module — see
 * docs/02-missing-features.md and the PatientProfile type doc comment).
 */
export const createWalkInPatient = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception"]);
  const input = CreateWalkInPatientRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only register patients for your own branch.");
  }

  const db = getFirestore();
  await assertBranchExists(db, input.hospitalId, input.branchId);

  const patientId = await writeWithAudit(db, {
    collection: "patients",
    data: {
      userId: null,
      name: input.name,
      age: input.age,
      gender: input.gender,
      dob: input.dob,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address,
      bloodGroup: input.bloodGroup,
      emergencyContact: input.emergencyContact,
      medicalHistory: input.medicalHistory,
      currentMedications: input.currentMedications,
      allergies: input.allergies,
      insurance: input.insurance ?? null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return CreateWalkInPatientResponse.parse({ patientId });
});
