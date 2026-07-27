import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { JoinWaitingListRequest, JoinWaitingListResponse } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

/** FR-6.5. patient (self) or reception — no open slot for this doctor+date. */
export const joinWaitingList = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient", "reception"]);
  const input = JoinWaitingListRequest.parse(request.data);

  if (caller.role === "patient" && caller.uid !== input.patientId) {
    throw new HttpsError("permission-denied", "You can only join the waiting list for yourself.");
  }
  if (caller.role === "reception") {
    assertOwnHospital(caller, input.hospitalId);
    if (caller.branchId !== input.branchId) {
      throw new HttpsError("permission-denied", "You can only manage the waiting list for your own branch.");
    }
  }

  const db = getFirestore();
  const patientSnap = await db.collection("patients").doc(input.patientId).get();
  if (!patientSnap.exists) {
    throw new HttpsError("not-found", "Patient not found.");
  }

  const countSnap = await db
    .collection("appointments")
    .where("doctorId", "==", input.doctorId)
    .where("date", "==", input.date)
    .where("waitingListPosition", ">", 0)
    .count()
    .get();
  const waitingListPosition = countSnap.data().count + 1;

  const appointmentId = await writeWithAudit(db, {
    collection: "appointments",
    data: {
      patientId: input.patientId,
      patientName: patientSnap.data()?.name ?? "",
      doctorId: input.doctorId,
      departmentId: input.departmentId,
      type: "normal",
      priority: 0,
      date: input.date,
      session: null,
      bookedVia: null,
      startTime: null,
      token: null,
      status: "pending",
      waitingListPosition,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return JoinWaitingListResponse.parse({ appointmentId, waitingListPosition });
});
