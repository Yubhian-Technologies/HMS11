import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CheckInPatientRequest, CheckInPatientResponse, branchCollection } from "@hms/shared";
import { requireOperation } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * Reception only, own branch — Reception checks the patient in and sends
 * them into the department queue (also does vitals entry — recordVitals —
 * so the whole front-desk handoff to the doctor is one role's job).
 * Attendance is a Reception-owned operation; Office does not mark
 * attendance. Token is a simple sequential counter per branch+day — count
 * of already-checked-in-or-past appointments today, plus one. Good enough
 * for a single front desk's daily queue; not globally unique across
 * branches (never needs to be). Runs inside a transaction (re-checks
 * `status` from the transaction's own read, not a separate get()) so two
 * concurrent check-in attempts on the same appointment can't both succeed
 * and silently overwrite each other's token.
 */
export const checkInPatient = onCall(async (request) => {
  const caller = requireOperation(request, "appointment.checkIn");
  const { hospitalId, branchId, appointmentId } = CheckInPatientRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only check in patients for your own branch.");
  }

  const db = getFirestore();
  const appointmentsCollection = branchCollection(hospitalId, branchId, "appointments");
  const apptRef = db.collection(appointmentsCollection).doc(appointmentId);

  const token = await db.runTransaction(async (tx) => {
    const apptSnap = await tx.get(apptRef);
    const appt = apptSnap.data();
    if (!apptSnap.exists) {
      throw new HttpsError("not-found", "Appointment not found.");
    }
    if (appt?.status !== "BOOKED") {
      throw new HttpsError("failed-precondition", "Only an approved (booked) appointment can be checked in.");
    }

    const countSnap = await tx.get(
      db
        .collection(appointmentsCollection)
        .where("date", "==", appt.date)
        .where("checkIn", "!=", null)
        .count(),
    );
    const tokenValue = String(countSnap.data().count + 1).padStart(3, "0");
    const now = FieldValue.serverTimestamp();

    tx.update(apptRef, {
      checkIn: { checkedInAt: now, checkedInBy: caller.uid, token: tokenValue },
      status: "CHECKED_IN",
      updatedAt: now,
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "statusChange",
      entityType: "appointments",
      entityId: appointmentId,
      before: { status: "BOOKED" },
      after: { status: "CHECKED_IN", token: tokenValue },
      createdAt: now,
    });

    return tokenValue;
  });

  return CheckInPatientResponse.parse({ token });
});
