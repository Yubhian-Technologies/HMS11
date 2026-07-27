import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { BookAppointmentRequest, BookAppointmentResponse, branchCollection, doctorCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { sendNotification } from "../notifications/sendNotification";

const SESSION_LABEL: Record<string, string> = { morning: "morning", afternoon: "afternoon" };

/**
 * FR-6.1 / FR-6.2. Patient (self) or Reception (on behalf). Booking draws
 * from the (doctorId, date, session) pool's counter rather than claiming a
 * specific pre-existing document — Patient can only draw from the
 * non-reserved (online) portion; Reception draws from the walk-in-reserved
 * portion first, falling back to the online portion if the reserved pool is
 * exhausted (FR-4.5 add-on). The appointment itself starts "pending" —
 * Office still has to approve the booking (FR-6.3), a separate gate from
 * the doctor having approved the session pool's existence (FR-4.4).
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

  const poolRef = db
    .collection(doctorCollection(input.hospitalId, input.branchId, input.doctorId, "slots"))
    .doc(`${input.date}_${input.session}`);
  const appointmentRef = db.collection(branchCollection(input.hospitalId, input.branchId, "appointments")).doc();

  await db.runTransaction(async (tx) => {
    const poolSnap = await tx.get(poolRef);
    const pool = poolSnap.data();
    if (!poolSnap.exists) {
      throw new HttpsError("not-found", "This session is not open for booking.");
    }
    if (pool?.status !== "approved") {
      throw new HttpsError("failed-precondition", "This session is no longer available.");
    }

    const onlineRemaining = Math.max(
      0,
      (pool.totalCount as number) - (pool.walkInReserved as number) - (pool.onlineBookedCount as number),
    );
    const walkInRemaining = Math.max(0, (pool.walkInReserved as number) - (pool.walkInBookedCount as number));

    let bucket: "online" | "walkin";
    if (caller.role === "patient") {
      if (onlineRemaining <= 0) {
        throw new HttpsError("failed-precondition", "This session is fully booked.");
      }
      bucket = "online";
    } else {
      if (walkInRemaining > 0) {
        bucket = "walkin";
      } else if (onlineRemaining > 0) {
        bucket = "online";
      } else {
        throw new HttpsError("failed-precondition", "This session is fully booked.");
      }
    }

    const now = FieldValue.serverTimestamp();

    tx.update(poolRef, {
      [bucket === "online" ? "onlineBookedCount" : "walkInBookedCount"]: FieldValue.increment(1),
      updatedAt: now,
    });

    tx.set(appointmentRef, {
      patientId: input.patientId,
      patientName: patientSnap.data()?.name ?? "",
      doctorId: input.doctorId,
      departmentId: input.departmentId,
      type: "normal",
      priority: 0,
      date: input.date,
      session: input.session,
      bookedVia: bucket,
      checkIn: null,
      vitals: null,
      consultationSummary: null,
      status: "PENDING",
      waitingListPosition: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    const poolAuditRef = db.collection("auditLogs").doc();
    tx.set(poolAuditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "update",
      entityType: "doctorSlots",
      entityId: poolRef.id,
      before: null,
      after: { bucket },
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
      after: { patientId: input.patientId, doctorId: input.doctorId, status: "PENDING" },
      createdAt: now,
    });

    return bucket;
  });

  await sendNotification({
    userId: input.patientId,
    type: "appointmentConfirmation",
    title: "Appointment requested",
    body: `Your ${SESSION_LABEL[input.session]} appointment on ${input.date} is pending Office approval.`,
    hospitalId: input.hospitalId,
    relatedEntityId: appointmentRef.id,
  });

  return BookAppointmentResponse.parse({ appointmentId: appointmentRef.id, status: "PENDING" });
});
