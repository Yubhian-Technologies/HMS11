import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Appointment, type Invoice } from "@hms/shared";

export type InvoiceRecord = Invoice & { id: string };
export type AppointmentRecord = Appointment & { id: string };

/** Completed visits today with no invoice yet — ready for Reception to bill (FR-15.1). */
export async function listUnbilledCompletedAppointments(
  hospitalId: string,
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .where("date", "==", date)
    .where("status", "==", "COMPLETED")
    .get();
  const appointments = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));

  const withInvoiceFlags = await Promise.all(
    appointments.map(async (appt) => {
      const invSnap = await db
        .collection(branchCollection(hospitalId, branchId, "invoices"))
        .where("appointmentId", "==", appt.id)
        .limit(1)
        .get();
      return { appt, hasInvoice: !invSnap.empty };
    }),
  );

  return withInvoiceFlags.filter((w) => !w.hasInvoice).map((w) => w.appt);
}

export async function getInvoiceForAppointment(
  hospitalId: string,
  branchId: string,
  appointmentId: string,
): Promise<InvoiceRecord | null> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "invoices"))
    .where("appointmentId", "==", appointmentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Invoice) };
}

/** Admin's hospital-wide billing overview spans every branch — one collectionGroup scan. */
export async function listOutstandingInvoicesForHospital(hospitalId: string): Promise<InvoiceRecord[]> {
  const snap = await getAdminDb()
    .collectionGroup("invoices")
    .where("hospitalId", "==", hospitalId)
    .where("status", "in", ["unpaid", "partial"])
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Invoice) }));
}

export async function listOutstandingInvoicesForBranch(hospitalId: string, branchId: string): Promise<InvoiceRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "invoices"))
    .where("status", "in", ["unpaid", "partial"])
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Invoice) }));
}
