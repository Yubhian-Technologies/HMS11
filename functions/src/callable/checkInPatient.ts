import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CheckInPatientRequest, CheckInPatientResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/**
 * FR-8.1. reception only, own branch. Token is a simple sequential counter
 * per branch+day — count of already-checked-in-or-past appointments today,
 * plus one. Good enough for a single front desk's daily queue; not
 * globally unique across branches (never needs to be).
 */
export const checkInPatient = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception"]);
  const { hospitalId, branchId, appointmentId } = CheckInPatientRequest.parse(request.data);
  assertOwnHospital(caller, hospitalId);

  if (caller.branchId !== branchId) {
    throw new HttpsError("permission-denied", "You can only check in patients for your own branch.");
  }

  const db = getFirestore();
  const apptRef = db.collection("appointments").doc(appointmentId);
  const apptSnap = await apptRef.get();
  const appt = apptSnap.data();
  if (!apptSnap.exists || appt?.hospitalId !== hospitalId || appt?.branchId !== branchId) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appt?.status !== "approved") {
    throw new HttpsError("failed-precondition", "Only an approved appointment can be checked in.");
  }

  const countSnap = await db
    .collection("appointments")
    .where("branchId", "==", branchId)
    .where("date", "==", appt.date)
    .where("token", "!=", null)
    .count()
    .get();
  const token = String(countSnap.data().count + 1).padStart(3, "0");

  await writeWithAudit(db, {
    collection: "appointments",
    docId: appointmentId,
    data: { status: "checkedIn", token },
    action: "statusChange",
    before: appt,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId },
  });

  return CheckInPatientResponse.parse({ token });
});
