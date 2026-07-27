import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CheckInPatientRequest, CheckInPatientResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-8.1. reception only, own branch. Token is a simple sequential counter
 * per branch+day — count of already-checked-in-or-past appointments today,
 * plus one. Good enough for a single front desk's daily queue; not globally
 * unique across branches (never needs to be). Sets the embedded `checkIn`
 * field (docs/10-collections-schema.md §10.6) — vitals capture is a
 * separate, later step owned by Nurse (recordVitals.ts), not this callable.
 */
export const checkInPatient = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception"]);
  const { hospitalId, branchId, appointmentId } = CheckInPatientRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only check in patients for your own branch.");
  }

  const db = getFirestore();
  const appointmentsCollection = branchCollection(hospitalId, branchId, "appointments");
  const apptRef = db.collection(appointmentsCollection).doc(appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.status !== "BOOKED") {
    throw new HttpsError("failed-precondition", "Only an approved (booked) appointment can be checked in.");
  }

  const countSnap = await db
    .collection(appointmentsCollection)
    .where("date", "==", appt.date)
    .where("checkIn", "!=", null)
    .count()
    .get();
  const token = String(countSnap.data().count + 1).padStart(3, "0");
  const now = FieldValue.serverTimestamp();

  await apptRef.update({
    checkIn: { checkedInAt: now, checkedInBy: caller.uid, token },
    status: "CHECKED_IN",
    updatedAt: now,
  });

  await db.collection("auditLogs").doc().set({
    hospitalId,
    actorId: caller.uid,
    actorRole: caller.role,
    action: "statusChange",
    entityType: "appointments",
    entityId: appointmentId,
    before: { status: "BOOKED" },
    after: { status: "CHECKED_IN", token },
    createdAt: now,
  });

  return CheckInPatientResponse.parse({ token });
});
