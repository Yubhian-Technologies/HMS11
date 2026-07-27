import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Appointment, Vitals } from "@hms/shared";

export type AppointmentRecord = Appointment & { id: string };
export type VitalsRecord = Vitals & { id: string };

function sessionOrder(session: Appointment["session"]): number {
  return session === "morning" ? 0 : session === "afternoon" ? 1 : 2;
}

/** Approved appointments today, ready to check in (FR-8.1). */
export async function listReadyForCheckIn(branchId: string, date: string): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection("appointments")
    .where("branchId", "==", branchId)
    .where("date", "==", date)
    .where("status", "==", "approved")
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }))
    .sort((a, b) => sessionOrder(a.session) - sessionOrder(b.session));
}

/** Checked-in today, awaiting vitals — includes emergencies (already "approved" but no slot). */
export async function listAwaitingVitals(branchId: string, date: string): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection("appointments")
    .where("branchId", "==", branchId)
    .where("date", "==", date)
    .where("status", "==", "checkedIn")
    .get();
  const appointments = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));

  const withVitals = await Promise.all(
    appointments.map(async (appt) => {
      const vitalsSnap = await getAdminDb()
        .collection("vitals")
        .where("appointmentId", "==", appt.id)
        .limit(1)
        .get();
      return { appt, hasVitals: !vitalsSnap.empty };
    }),
  );

  return withVitals.filter((w) => !w.hasVitals).map((w) => w.appt);
}

/** FR-8.3 — read by the Doctor's queue/consultation views. */
export async function getVitalsForAppointment(appointmentId: string): Promise<VitalsRecord | null> {
  const snap = await getAdminDb().collection("vitals").where("appointmentId", "==", appointmentId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Vitals) };
}
