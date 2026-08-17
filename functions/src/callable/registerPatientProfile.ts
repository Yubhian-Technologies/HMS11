import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { RegisterPatientProfileRequest, RegisterPatientProfileResponse } from "@hms/shared";

/**
 * FR-1.2 / FR-5.1. Called immediately after the client creates its own
 * Firebase Auth account (patient self-signup — the only role that isn't
 * admin-provisioned, docs/07-user-roles.md §7.2). No role claim exists yet
 * at this point, so this doesn't go through requireCallerRole like every
 * other callable — it only requires *some* authenticated caller with no
 * existing profile. Email is read from the caller's own verified auth
 * token, never trusted from the request body.
 */
export const registerPatientProfile = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }
  if (auth.token.role) {
    throw new HttpsError("failed-precondition", "This account already has a role assigned.");
  }

  const email = auth.token.email;
  if (!email) {
    throw new HttpsError("failed-precondition", "Account has no verified email.");
  }

  const input = RegisterPatientProfileRequest.parse(request.data);
  const db = getFirestore();

  const existing = await db.collection("users").doc(auth.uid).get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "Profile already registered.");
  }

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.set(db.collection("users").doc(auth.uid), {
      role: "patient",
      name: input.name,
      email,
      phone: "",
      fcmTokens: [],
      status: "active",
      hospitalId: null,
      branchId: null,
      createdBy: auth.uid,
      createdAt: now,
      updatedAt: now,
    });

    // Signup collects name only (product decision — no intake wizard at
    // account creation). Everything below is a neutral placeholder the
    // patient fills in for real later via updatePatientProfile from their
    // profile screen; kept present (not omitted) so this doc still
    // satisfies PatientProfile's shape for every other reader.
    tx.set(db.collection("patients").doc(auth.uid), {
      userId: auth.uid,
      name: input.name,
      age: 0,
      gender: "other",
      dob: "",
      phone: "",
      email,
      address: { line1: "", city: "", state: "", postalCode: "", country: "" },
      bloodGroup: "",
      emergencyContact: { name: "", relation: "", phone: "" },
      medicalHistory: "",
      currentMedications: "",
      allergies: "",
      insurance: null,
      hospitalId: null,
      branchId: null,
      status: "active",
      createdBy: auth.uid,
      createdAt: now,
      updatedAt: now,
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: "platform",
      actorId: auth.uid,
      actorRole: "patient",
      action: "create",
      entityType: "patients",
      entityId: auth.uid,
      before: null,
      after: { name: input.name },
      createdAt: now,
    });
  });

  await getAuth().setCustomUserClaims(auth.uid, { role: "patient", hospitalId: null, branchId: null });

  return RegisterPatientProfileResponse.parse({ success: true });
});
