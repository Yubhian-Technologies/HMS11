import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Appointment, Invoice } from "@hms/shared";

export type InvoiceRecord = Invoice & { id: string };
export type AppointmentRecord = Appointment & { id: string };

/** Completed visits today with no invoice yet — ready for Reception to bill (FR-15.1). */
export async function listUnbilledCompletedAppointments(
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const db = getAdminDb();
  const snap = await db
    .collection("appointments")
    .where("branchId", "==", branchId)
    .where("date", "==", date)
    .where("status", "==", "completed")
    .get();
  const appointments = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));

  const withInvoiceFlags = await Promise.all(
    appointments.map(async (appt) => {
      const invSnap = await db.collection("invoices").where("appointmentId", "==", appt.id).limit(1).get();
      return { appt, hasInvoice: !invSnap.empty };
    }),
  );

  return withInvoiceFlags.filter((w) => !w.hasInvoice).map((w) => w.appt);
}

export async function getInvoiceForAppointment(appointmentId: string): Promise<InvoiceRecord | null> {
  const snap = await getAdminDb()
    .collection("invoices")
    .where("appointmentId", "==", appointmentId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Invoice) };
}

export async function listOutstandingInvoicesForHospital(hospitalId: string): Promise<InvoiceRecord[]> {
  const snap = await getAdminDb()
    .collection("invoices")
    .where("hospitalId", "==", hospitalId)
    .where("status", "in", ["unpaid", "partial"])
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Invoice) }));
}

export async function listOutstandingInvoicesForBranch(branchId: string): Promise<InvoiceRecord[]> {
  const snap = await getAdminDb()
    .collection("invoices")
    .where("branchId", "==", branchId)
    .where("status", "in", ["unpaid", "partial"])
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Invoice) }));
}
