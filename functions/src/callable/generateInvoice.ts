import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GenerateInvoiceRequest, GenerateInvoiceResponse, branchCollection, doctorPath } from "@hms/shared";
import { writeWithAudit } from "@hms/shared-server";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";

interface LineItem {
  type: "consultation" | "lab" | "pharmacy" | "room";
  description: string;
  amount: number;
}

/**
 * FR-15.1. reception or admin, own branch. Generated on demand at
 * checkout, aggregating whatever consultation/lab/pharmacy records exist
 * for the appointment at that moment — see docs/10-collections-schema.md
 * Invoice doc comment for why this isn't incremental, and why room charges
 * aren't auto-computed.
 */
export const generateInvoice = onCall(async (request) => {
  const caller = requireCallerRole(request, ["reception", "admin"]);
  const input = GenerateInvoiceRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId && caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only bill visits in your own branch.");
  }

  const db = getFirestore();
  const apptSnap = await db
    .collection(branchCollection(input.hospitalId, input.branchId, "appointments"))
    .doc(input.appointmentId)
    .get();
  const appt = apptSnap.data();
  if (!appt) {
    throw new HttpsError("not-found", "Appointment not found.");
  }

  const existingSnap = await db
    .collection(branchCollection(input.hospitalId, input.branchId, "invoices"))
    .where("appointmentId", "==", input.appointmentId)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    throw new HttpsError("already-exists", "An invoice already exists for this appointment.");
  }

  const lineItems: LineItem[] = [];
  let admissionId: string | null = null;

  const consultationSummary = appt?.consultationSummary as { doctorId: string } | null | undefined;

  if (consultationSummary) {
    const doctorId = consultationSummary.doctorId;

    const doctorSnap = await db.doc(doctorPath(input.hospitalId, input.branchId, doctorId)).get();
    const fee = (doctorSnap.data()?.consultationFee as number | undefined) ?? 0;
    lineItems.push({ type: "consultation", description: "Consultation fee", amount: fee });

    const labOrdersSnap = await db
      .collection(branchCollection(input.hospitalId, input.branchId, "labOrders"))
      .where("appointmentId", "==", input.appointmentId)
      .get();
    for (const orderDoc of labOrdersSnap.docs) {
      const order = orderDoc.data();
      const testSnap = await db
        .collection(branchCollection(input.hospitalId, input.branchId, "labTestMaster"))
        .doc(order.testId as string)
        .get();
      const price = (testSnap.data()?.price as number | undefined) ?? 0;
      lineItems.push({ type: "lab", description: order.testName as string, amount: price });
    }

    const prescriptionsSnap = await db
      .collection(branchCollection(input.hospitalId, input.branchId, "prescriptions"))
      .where("appointmentId", "==", input.appointmentId)
      .get();
    for (const presDoc of prescriptionsSnap.docs) {
      const dispensesSnap = await db
        .collection(branchCollection(input.hospitalId, input.branchId, "medicineDispenses"))
        .where("prescriptionId", "==", presDoc.id)
        .get();
      for (const dispenseDoc of dispensesSnap.docs) {
        const dispense = dispenseDoc.data();
        const items = presDoc.data().items as { medicineName: string }[];
        const itemName = items[dispense.prescriptionItemIndex as number]?.medicineName ?? "Medicine";
        lineItems.push({
          type: "pharmacy",
          description: itemName,
          amount: (dispense.unitPriceAtDispense as number) * (dispense.quantityDispensed as number),
        });
      }
    }

    const admissionsSnap = await db
      .collection(branchCollection(input.hospitalId, input.branchId, "admissions"))
      .where("appointmentId", "==", input.appointmentId)
      .limit(1)
      .get();
    if (!admissionsSnap.empty) {
      const admissionDoc = admissionsSnap.docs[0]!;
      admissionId = admissionDoc.id;
      const admission = admissionDoc.data();

      if (admission.bedId) {
        const bedSnap = await db
          .collection(branchCollection(input.hospitalId, input.branchId, "beds"))
          .doc(admission.bedId as string)
          .get();
        const bed = bedSnap.data();
        if (bed?.roomId) {
          const roomSnap = await db
            .collection(branchCollection(input.hospitalId, input.branchId, "rooms"))
            .doc(bed.roomId as string)
            .get();
          const dailyRate = (roomSnap.data()?.dailyRate as number | undefined) ?? 0;

          const admittedAt = (admission.admittedAt as Timestamp | null)?.toDate();
          const dischargedAt = (admission.dischargedAt as Timestamp | null)?.toDate();
          if (admittedAt) {
            const endDate = dischargedAt ?? new Date();
            const days = Math.max(1, Math.ceil((endDate.getTime() - admittedAt.getTime()) / 86_400_000));
            lineItems.push({
              type: "room",
              description: `Room charge (${days} day${days === 1 ? "" : "s"})`,
              amount: days * dailyRate,
            });
          }
        }
      }
    }
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const invoiceId = await writeWithAudit(db, {
    collection: branchCollection(input.hospitalId, input.branchId, "invoices"),
    data: {
      appointmentId: input.appointmentId,
      admissionId,
      patientId: appt.patientId,
      lineItems,
      totalAmount,
      paidAmount: 0,
      paymentMethod: null,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "unpaid",
      createdBy: caller.uid,
    },
    action: "create",
    context: { actorId: caller.uid, actorRole: caller.role, hospitalId: input.hospitalId },
  });

  return GenerateInvoiceResponse.parse({ invoiceId, totalAmount });
});
