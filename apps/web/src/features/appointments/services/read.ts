import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Appointment, DoctorProfile, User } from "@hms/shared";

export type AppointmentRecord = Appointment & { id: string };
export type DoctorWithProfile = { id: string; name: string; profile: DoctorProfile };

function SESSION_ORDER(session: Appointment["session"]): number {
  return session === "morning" ? 0 : session === "afternoon" ? 1 : 2;
}

export async function listDoctorsByDepartment(
  hospitalId: string,
  departmentId: string,
): Promise<DoctorWithProfile[]> {
  const db = getAdminDb();
  const profilesSnap = await db
    .collection("doctorProfiles")
    .where("hospitalId", "==", hospitalId)
    .where("departmentId", "==", departmentId)
    .where("status", "==", "active")
    .get();

  const doctors = await Promise.all(
    profilesSnap.docs.map(async (doc) => {
      const userDoc = await db.collection("users").doc(doc.id).get();
      const user = userDoc.data() as User | undefined;
      return { id: doc.id, name: user?.name ?? "Unknown", profile: doc.data() as DoctorProfile };
    }),
  );
  return doctors;
}

export async function listBranchAppointmentsForDate(
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection("appointments")
    .where("branchId", "==", branchId)
    .where("date", "==", date)
    .orderBy("startTime", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));
}

/**
 * Same data, spanning the rolling 3-day window instead of a single date —
 * reuses the already-indexed per-date query (branchId + date + startTime)
 * so no new composite index is needed. Office views (Appointments, Daily
 * Schedule, Waiting List) all need this: a patient can book any day in the
 * window, not just today.
 */
export async function listBranchAppointmentsForDates(
  branchId: string,
  dates: string[],
): Promise<AppointmentRecord[]> {
  const perDate = await Promise.all(dates.map((date) => listBranchAppointmentsForDate(branchId, date)));
  return perDate.flat();
}

/** Doctor's live queue — both normal and emergency appointments reach "checkedIn" via the same Reception flow. */
export async function listDoctorQueue(doctorId: string, date: string): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection("appointments")
    .where("doctorId", "==", doctorId)
    .where("date", "==", date)
    .where("status", "==", "checkedIn")
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }))
    .sort((a, b) => b.priority - a.priority || SESSION_ORDER(a.session) - SESSION_ORDER(b.session));
}

export async function getAppointment(appointmentId: string): Promise<AppointmentRecord | null> {
  const doc = await getAdminDb().collection("appointments").doc(appointmentId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Appointment) };
}

export async function listPatientAppointments(patientId: string): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection("appointments")
    .where("patientId", "==", patientId)
    .orderBy("date", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));
}
