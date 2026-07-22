import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { BookAppointmentRequest, BookAppointmentResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-6.1 / FR-6.2. Patient (self) or Reception (on behalf). Booking a slot
 * immediately marks it "booked" (removing it from availability) while the
 * appointment itself starts "pending" — Office still has to approve the
 * booking (FR-6.3), a separate gate from the doctor having approved the
 * slot's existence (FR-4.4).
 */
export const bookAppointment = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient", "reception"]);
  const input = BookAppointmentRequest.parse(request.data);

  if (caller.role === "patient" && caller.uid !== input.patientId) {
    throw new HttpsError("permission-denied", "You can only book appointments for yourself.");
  }
  if (caller.role === "reception") {
    if (caller.hospitalId !== input.hospitalId || caller.branchId !== input.branchId) {
      throw new HttpsError("permission-denied", "You can only book within your own branch.");
    }
  }

  const db = getFirestore();
  const patientSnap = await db.collection("patients").doc(input.patientId).get();
  if (!patientSnap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }

  const slotRef = db.collection("doctorSlots").doc(input.slotId);
  const slotSnap = await slotRef.get();
  const slot = slotSnap.data();
  if (
    !slotSnap.exists ||
    slot?.hospitalId !== input.hospitalId ||
    slot?.branchId !== input.branchId
  ) {
    throw new HttpsError("not-found", "Slot not found.");
  }
  if (slot?.status !== "approved") {
    throw new HttpsError("failed-precondition", "This slot is no longer available.");
  }

  const appointmentRef = db.collection("appointments").doc();

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.update(slotRef, { status: "booked", updatedAt: now });

    tx.set(appointmentRef, {
      patientId: input.patientId,
      patientName: patientSnap.data()?.name ?? "",
      doctorId: slot?.doctorId,
      slotId: input.slotId,
      departmentId: input.departmentId,
      type: "normal",
      priority: 0,
      date: slot?.date,
      startTime: slot?.startTime,
      token: null,
      status: "pending",
      waitingListPosition: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    const slotAuditRef = db.collection("auditLogs").doc();
    tx.set(slotAuditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "statusChange",
      entityType: "doctorSlots",
      entityId: input.slotId,
      before: { status: "approved" },
      after: { status: "booked" },
      createdAt: now,
    });

    const apptAuditRef = db.collection("auditLogs").doc();
    tx.set(apptAuditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "appointments",
      entityId: appointmentRef.id,
      before: null,
      after: { patientId: input.patientId, doctorId: slot?.doctorId, status: "pending" },
      createdAt: now,
    });
  });

  await sendNotification({
    userId: input.patientId,
    type: "appointmentConfirmation",
    title: "Appointment requested",
    body: `Your appointment on ${slot?.date} at ${slot?.startTime} is pending Office approval.`,
    hospitalId: input.hospitalId,
    relatedEntityId: appointmentRef.id,
  });

  return BookAppointmentResponse.parse({ appointmentId: appointmentRef.id, status: "pending" });
});
