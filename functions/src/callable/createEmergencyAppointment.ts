import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CreateEmergencyAppointmentRequest, CreateEmergencyAppointmentResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { todayIso } from "../services/datetime";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-7.1 / FR-7.2 / FR-7.3. reception or office, own branch. No slot
 * involved at all — priority 1 (normal bookings are 0) sorts it to the
 * front of any doctor queue. Status goes straight to "approved":
 * emergencies bypass the office-approval gate that normal bookings go
 * through (FR-6.3), by definition. Notifies the assigned doctor and every
 * Office staff member in the branch (FR-7.3 — "notifies Office" means the
 * role, not a single account).
 */
export const createEmergencyAppointment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception", "office"]);
  const input = CreateEmergencyAppointmentRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only create emergencies in your own branch.");
  }

  const db = getFirestore();
  const [patientSnap, doctorSnap] = await Promise.all([
    db.collection("patients").doc(input.patientId).get(),
    db.collection("doctorProfiles").doc(input.doctorId).get(),
  ]);
  if (!patientSnap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }
  if (!doctorSnap.exists || doctorSnap.data()?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Doctor not found in this hospital.");
  }

  const now = new Date();
  const appointmentId = await writeWithAudit(db, {
    collection: "appointments",
    data: {
      patientId: input.patientId,
      patientName: patientSnap.data()?.name ?? "",
      doctorId: input.doctorId,
      slotId: null,
      departmentId: input.departmentId,
      type: "emergency",
      priority: 1,
      date: todayIso(),
      startTime: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
      token: null,
      status: "approved",
      waitingListPosition: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  const officeStaffSnap = await db
    .collection("users")
    .where("hospitalId", "==", input.hospitalId)
    .where("branchId", "==", input.branchId)
    .where("role", "==", "office")
    .get();

  await Promise.all([
    sendNotification({
      userId: input.doctorId,
      type: "emergencyUpdate",
      title: "Emergency patient assigned",
      body: `${patientSnap.data()?.name ?? "A patient"} has been added to your queue as an emergency.`,
      hospitalId: input.hospitalId,
      relatedEntityId: appointmentId,
    }),
    ...officeStaffSnap.docs.map((doc) =>
      sendNotification({
        userId: doc.id,
        type: "emergencyUpdate",
        title: "Emergency check-in",
        body: `${patientSnap.data()?.name ?? "A patient"} checked in as an emergency.`,
        hospitalId: input.hospitalId,
        relatedEntityId: appointmentId,
      }),
    ),
  ]);

  return CreateEmergencyAppointmentResponse.parse({ appointmentId });
});
