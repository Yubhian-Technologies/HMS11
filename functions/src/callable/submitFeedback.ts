import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { SubmitFeedbackRequest, SubmitFeedbackResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-17.1 / FR-17.2. patient only, own completed appointment. */
export const submitFeedback = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient"]);
  const input = SubmitFeedbackRequest.parse(request.data);

  const db = getFirestore();
  const apptSnap = await db.collection("appointments").doc(input.appointmentId).get();
  const appointment = apptSnap.data();
  if (!apptSnap.exists) {
    throw new HttpsError("not-found", "Appointment not found.");
  }
  if (appointment?.patientId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only leave feedback on your own appointments.");
  }
  if (appointment.status !== "completed") {
    throw new HttpsError("failed-precondition", "Feedback can only be left on a completed appointment.");
  }

  const existing = await db
    .collection("feedback")
    .where("appointmentId", "==", input.appointmentId)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new HttpsError("already-exists", "Feedback has already been submitted for this appointment.");
  }

  const feedbackId = await writeWithAudit(db, {
    collection: "feedback",
    data: {
      appointmentId: input.appointmentId,
      patientId: caller.uid,
      rating: input.rating,
      comment: input.comment,
      isComplaint: input.isComplaint,
      // Non-complaint feedback has nothing to route — see docs comment on
      // the Feedback type in @hms/shared.
      status: input.isComplaint ? "open" : "resolved",
      hospitalId: appointment.hospitalId,
      branchId: appointment.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    before: null,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: appointment.hospitalId },
  });

  return SubmitFeedbackResponse.parse({ feedbackId });
});
