import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { BookAppointmentRequest, BookAppointmentResponse, branchCollection, doctorCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { sendNotification } from "../notifications/sendNotification";

const SESSION_LABEL: Record<string, string> = { morning: "morning", afternoon: "afternoon" };

/**
 * FR-6.1 / FR-6.2. Patient (self) or Reception (on behalf) — two different
 * shapes of the same booking. A patient never picks a doctor (doctor names
 * aren't shown to patients at all — see listBookableDepartments): they book
 * a department, and this resolves to whichever doctor in that department at
 * that (date, session) currently has the MOST remaining online capacity —
 * both to spread load and because with several doctors racing for the same
 * slot, trying candidates by "most room" fails less often than a fixed
 * order would under concurrent bookings. Reception still picks a specific
 * doctorId directly (a walk-in patient at the counter may ask for one by
 * name) and draws from the walk-in-reserved portion first, falling back to
 * online if that's exhausted (FR-4.5 add-on).
 *
 * Both paths start "BOOKED" directly, immediately, in the same transaction
 * that decrements the pool's counter — the slot pool's own "approved"
 * status (doctor-confirmed + Office-published, setSlotStatus) already is
 * the approval gate; there's no second, per-appointment Office-review step
 * layered on top of a slot the pool itself already cleared for booking.
 * (This does not touch `joinWaitingList`, whose "PENDING" +
 * waitingListPosition > 0 means something else entirely — a seat not yet
 * available at all, not a booking pending review.)
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

  let doctorId: string;
  let departmentId: string;

  if (caller.role === "patient") {
    if (!input.departmentId) {
      throw new HttpsError("invalid-argument", "departmentId is required.");
    }
    const doctorsSnap = await db
      .collection(`hospitals/${input.hospitalId}/branches/${input.branchId}/doctors`)
      .where("departmentId", "==", input.departmentId)
      .where("status", "==", "active")
      .get();
    if (doctorsSnap.empty) {
      throw new HttpsError("not-found", "No doctors available in this department.");
    }
    const slotSnaps = await Promise.all(
      doctorsSnap.docs.map((d) =>
        db
          .doc(`${doctorCollection(input.hospitalId, input.branchId, d.id, "slots")}/${input.date}_${input.session}`)
          .get(),
      ),
    );
    let bestDoctorId: string | null = null;
    let bestRemaining = 0;
    slotSnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const pool = snap.data()!;
      if (pool.status !== "approved") return;
      const remaining = Math.max(0, pool.totalCount - pool.walkInReserved - pool.onlineBookedCount);
      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestDoctorId = doctorsSnap.docs[i]!.id;
      }
    });
    if (!bestDoctorId) {
      throw new HttpsError("failed-precondition", "This department is fully booked for that session.");
    }
    doctorId = bestDoctorId;
    departmentId = input.departmentId;
  } else {
    if (!input.doctorId) {
      throw new HttpsError("invalid-argument", "doctorId is required.");
    }
    doctorId = input.doctorId;
    const doctorSnap = await db
      .doc(`hospitals/${input.hospitalId}/branches/${input.branchId}/doctors/${doctorId}`)
      .get();
    if (!doctorSnap.exists) {
      throw new HttpsError("not-found", "Doctor not found.");
    }
    departmentId = doctorSnap.data()!.departmentId as string;
  }

  const poolRef = db
    .collection(doctorCollection(input.hospitalId, input.branchId, doctorId, "slots"))
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
    const initialStatus = "BOOKED";

    tx.update(poolRef, {
      [bucket === "online" ? "onlineBookedCount" : "walkInBookedCount"]: FieldValue.increment(1),
      updatedAt: now,
    });

    tx.set(appointmentRef, {
      patientId: input.patientId,
      patientName: patientSnap.data()?.name ?? "",
      doctorId,
      departmentId,
      type: "normal",
      priority: 0,
      date: input.date,
      session: input.session,
      bookedVia: bucket,
      checkIn: null,
      vitals: null,
      consultationSummary: null,
      consultDraft: null,
      status: initialStatus,
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
      after: { patientId: input.patientId, doctorId, status: initialStatus },
      createdAt: now,
    });

    return { bucket, initialStatus };
  });

  await sendNotification({
    userId: input.patientId,
    type: "appointmentConfirmation",
    title: "Appointment confirmed",
    body: `Your ${SESSION_LABEL[input.session]} appointment on ${input.date} is confirmed.`,
    hospitalId: input.hospitalId,
    relatedEntityId: appointmentRef.id,
  });

  // Notify every Office user at this branch so bookings surface without
  // them having to poll — one appointment can affect Office's plan for the
  // whole department (see the consolidated bookings view).
  const officeStaffSnap = await db
    .collection("users")
    .where("role", "==", "office")
    .where("hospitalId", "==", input.hospitalId)
    .where("branchId", "==", input.branchId)
    .where("status", "==", "active")
    .get();
  await Promise.all(
    officeStaffSnap.docs.map((staffDoc) =>
      sendNotification({
        userId: staffDoc.id,
        type: "appointmentConfirmation",
        title: "New booking",
        body: `${patientSnap.data()?.name ?? "A patient"} booked ${SESSION_LABEL[input.session]} on ${input.date}.`,
        hospitalId: input.hospitalId,
        relatedEntityId: appointmentRef.id,
      }),
    ),
  );

  return BookAppointmentResponse.parse({ appointmentId: appointmentRef.id, status: "BOOKED" });
});
