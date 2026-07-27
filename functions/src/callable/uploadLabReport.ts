import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { UploadLabReportRequest, UploadLabReportResponse, branchCollection } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-10.3. lab only, own branch. Order must be "verified" first. The file
 * itself is already in Storage by the time this runs (client uploads
 * directly, gated by storage.rules — docs/12-security-rules.md §12.5);
 * this just persists the Firestore record and flips the order to
 * "reportUploaded", then notifies both the ordering doctor and the patient.
 */
export const uploadLabReport = onCall(async (request) => {
  const caller = requireCallerRole(request, ["lab"]);
  const input = UploadLabReportRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);
  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only manage lab orders in your own branch.");
  }

  const db = getFirestore();
  const orderRef = db.collection(branchCollection(input.hospitalId, input.branchId, "labOrders")).doc(input.labOrderId);
  const orderSnap = await orderRef.get();
  const order = orderSnap.data();
  if (!orderSnap.exists) {
    throw new HttpsError("not-found", "Lab order not found.");
  }
  if (order?.status !== "verified") {
    throw new HttpsError("failed-precondition", "The order must be verified before uploading a report.");
  }

  const reportRef = db.collection(branchCollection(input.hospitalId, input.branchId, "labReports")).doc();

  await db.runTransaction(async (tx) => {
    const now = FieldValue.serverTimestamp();

    tx.set(reportRef, {
      labOrderId: input.labOrderId,
      patientId: order.patientId,
      fileUrl: input.fileUrl,
      verifiedBy: caller.uid,
      summaryNotes: input.summaryNotes ?? null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    tx.update(orderRef, { status: "reportUploaded", updatedAt: now });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "labReports",
      entityId: reportRef.id,
      before: null,
      after: { labOrderId: input.labOrderId },
      createdAt: now,
    });
  });

  await Promise.all([
    sendNotification({
      userId: order.doctorId,
      type: "labReportReady",
      title: "Lab report ready",
      body: `${order.testName} report is ready for your review.`,
      hospitalId: input.hospitalId,
      relatedEntityId: reportRef.id,
    }),
    sendNotification({
      userId: order.patientId,
      type: "labReportReady",
      title: "Your lab report is ready",
      body: `${order.testName} report has been uploaded.`,
      hospitalId: input.hospitalId,
      relatedEntityId: reportRef.id,
    }),
  ]);

  return UploadLabReportResponse.parse({ labReportId: reportRef.id });
});
