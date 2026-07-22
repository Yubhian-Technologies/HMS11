import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { UpdatePatientProfileRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/**
 * FR-5.3. Patient may update their own record. Reception/Admin may update a
 * walk-in record (`userId == null`) that belongs to their own hospital —
 * self-registered patients' records aren't hospital-editable at all yet, in
 * the absence of any appointment relationship to scope that access to (see
 * docs/10-collections-schema.md PatientProfile doc comment; Module 7 adds
 * that relationship).
 */
export const updatePatientProfile = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient", "reception", "admin"]);
  const { patientId, ...fields } = UpdatePatientProfileRequest.parse(request.data);

  const db = getFirestore();
  const snap = await db.collection("patients").doc(patientId).get();
  const patient = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }

  if (caller.role === "patient" && caller.uid !== patient?.userId) {
    throw new HttpsError("permission-denied", "You can only edit your own profile.");
  }
  if (caller.role !== "patient") {
    if (patient?.userId !== null) {
      throw new HttpsError(
        "permission-denied",
        "Only the patient themself can edit a self-registered profile.",
      );
    }
    if (caller.hospitalId !== patient?.hospitalId) {
      throw new HttpsError("permission-denied", "You can only edit patients in your own hospital.");
    }
  }

  const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "No fields to update.");
  }

  await writeWithAudit(db, {
    collection: "patients",
    docId: patientId,
    data: updates,
    action: "update",
    before: patient ?? null,
    context: {
      actorId: caller.uid,
      actorRole: caller.role,
      hospitalId: patient?.hospitalId ?? "platform",
    },
  });

  return { success: true };
});
