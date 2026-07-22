import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { LogMedicineStatusRequest } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";

/** FR-14.1. patient only, own medicineLogs entry. */
export const logMedicineStatus = onCall(async (request) => {
  const caller = requireCallerRole(request, ["patient"]);
  const { medicineLogId, patientStatus } = LogMedicineStatusRequest.parse(request.data);

  const db = getFirestore();
  const snap = await db.collection("medicineLogs").doc(medicineLogId).get();
  const log = snap.data();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Medicine log not found.");
  }
  if (log?.patientId !== caller.uid) {
    throw new HttpsError("permission-denied", "You can only log your own doses.");
  }

  await writeWithAudit(db, {
    collection: "medicineLogs",
    docId: medicineLogId,
    data: { patientStatus },
    action: "update",
    before: log,
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: log.hospitalId },
  });

  return { success: true };
});
