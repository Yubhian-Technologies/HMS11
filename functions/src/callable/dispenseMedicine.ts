import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { DispenseMedicineRequest, DispenseMedicineResponse } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { assertOwnHospital } from "../services/scope-checks";
import { addDays, todayIso } from "../services/datetime";
import { sendNotification } from "../notifications/sendNotification";

/**
 * FR-11.2 / FR-11.3. pharmacy only, own branch. Decrements the chosen
 * inventory item and schedules one medicineLog reminder per day of the
 * course — see docs/10-collections-schema.md MedicineLog doc comment for
 * why this isn't per-within-day dose.
 */
export const dispenseMedicine = onCall(async (request) => {
  const caller = requireCallerRole(request, ["pharmacy"]);
  const input = DispenseMedicineRequest.parse(request.data);
  assertOwnHospital(caller, input.hospitalId);

  if (caller.branchId !== input.branchId) {
    throw new HttpsError("permission-denied", "You can only dispense in your own branch.");
  }

  const db = getFirestore();
  const prescriptionSnap = await db.collection("prescriptions").doc(input.prescriptionId).get();
  const prescription = prescriptionSnap.data();
  if (!prescriptionSnap.exists || prescription?.hospitalId !== input.hospitalId) {
    throw new HttpsError("not-found", "Prescription not found.");
  }
  const items = (prescription.items ?? []) as { durationDays: number }[];
  const item = items[input.prescriptionItemIndex];
  if (!item) {
    throw new HttpsError("invalid-argument", "Prescription item not found at that index.");
  }

  const inventoryRef = db.collection("medicineInventory").doc(input.medicineInventoryItemId);

  const dispenseRef = db.collection("medicineDispenses").doc();
  const today = todayIso();
  const logRefs = Array.from({ length: item.durationDays }, () => db.collection("medicineLogs").doc());

  await db.runTransaction(async (tx) => {
    // Stock must be read *inside* the transaction (not via the plain .get()
    // this used to do before the transaction started) so Firestore can
    // detect and retry a conflicting concurrent dispense of the same item —
    // otherwise two simultaneous dispenses both compute their decrement from
    // the same stale count and the loser's decrement is silently lost.
    const inventorySnap = await tx.get(inventoryRef);
    const inventoryItem = inventorySnap.data();
    if (!inventorySnap.exists || inventoryItem?.hospitalId !== input.hospitalId) {
      throw new HttpsError("not-found", "Inventory item not found.");
    }
    if ((inventoryItem?.quantityInStock ?? 0) < input.quantityDispensed) {
      throw new HttpsError("failed-precondition", "Not enough stock to dispense this quantity.");
    }

    const now = FieldValue.serverTimestamp();

    tx.set(dispenseRef, {
      prescriptionId: input.prescriptionId,
      prescriptionItemIndex: input.prescriptionItemIndex,
      patientId: prescription.patientId,
      dispensedBy: caller.uid,
      quantityDispensed: input.quantityDispensed,
      medicineInventoryItemId: input.medicineInventoryItemId,
      unitPriceAtDispense: inventoryItem?.unitPrice ?? 0,
      hospitalId: input.hospitalId,
      branchId: input.branchId,
      status: "active",
      createdBy: caller.uid,
      createdAt: now,
      updatedAt: now,
    });

    tx.update(inventoryRef, {
      quantityInStock: (inventoryItem?.quantityInStock ?? 0) - input.quantityDispensed,
      updatedAt: now,
    });

    logRefs.forEach((logRef, i) => {
      const scheduledDate = addDays(today, i);
      tx.set(logRef, {
        patientId: prescription.patientId,
        prescriptionId: input.prescriptionId,
        prescriptionItemIndex: input.prescriptionItemIndex,
        scheduledAt: Timestamp.fromDate(new Date(`${scheduledDate}T09:00:00Z`)),
        patientStatus: "pending",
        reminderSentAt: null,
        hospitalId: input.hospitalId,
        branchId: input.branchId,
        status: "active",
        createdBy: caller.uid,
        createdAt: now,
        updatedAt: now,
      });
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      hospitalId: input.hospitalId,
      actorId: caller.uid,
      actorRole: caller.role,
      action: "create",
      entityType: "medicineDispenses",
      entityId: dispenseRef.id,
      before: null,
      after: { prescriptionId: input.prescriptionId, quantityDispensed: input.quantityDispensed },
      createdAt: now,
    });
  });

  await sendNotification({
    userId: prescription.patientId as string,
    type: "prescriptionReady",
    title: "Medicine dispensed",
    body: `${item.durationDays}-day course dispensed — daily reminders have been scheduled.`,
    hospitalId: input.hospitalId,
    relatedEntityId: dispenseRef.id,
  });

  return DispenseMedicineResponse.parse({
    dispenseId: dispenseRef.id,
    medicineLogIds: logRefs.map((r) => r.id),
  });
});
