import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Appointment, type DoctorProfile, type User } from "@hms/shared";

export type AppointmentRecord = Appointment & { id: string };
export type DoctorWithProfile = { id: string; name: string; profile: DoctorProfile };

function SESSION_ORDER(session: Appointment["session"]): number {
  return session === "morning" ? 0 : session === "afternoon" ? 1 : 2;
}

export async function listDoctorsByDepartment(
  hospitalId: string,
  branchId: string,
  departmentId: string,
): Promise<DoctorWithProfile[]> {
  const db = getAdminDb();
  const profilesSnap = await db
    .collection(branchCollection(hospitalId, branchId, "doctors"))
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
  hospitalId: string,
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .where("date", "==", date)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));
}

/**
 * Same data, spanning the rolling 3-day window instead of a single date.
 * Office views (Appointments, Daily Schedule, Waiting List) all need this: a
 * patient can book any day in the window, not just today.
 */
export async function listBranchAppointmentsForDates(
  hospitalId: string,
  branchId: string,
  dates: string[],
): Promise<AppointmentRecord[]> {
  const perDate = await Promise.all(dates.map((date) => listBranchAppointmentsForDate(hospitalId, branchId, date)));
  return perDate.flat();
}

/**
 * Doctor's live queue — patients ready to consult ("VITALS_COMPLETED") plus
 * ones already mid-consult ("CONSULTING", started but not yet submitted —
 * keeps a resumable consult visible instead of vanishing from the queue the
 * moment startConsultation fires).
 */
export async function listDoctorQueue(
  hospitalId: string,
  branchId: string,
  doctorId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .where("doctorId", "==", doctorId)
    .where("date", "==", date)
    .where("status", "in", ["VITALS_COMPLETED", "CONSULTING"])
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }))
    .sort((a, b) => b.priority - a.priority || SESSION_ORDER(a.session) - SESSION_ORDER(b.session));
}

/** Nurse's queue — patients checked in by Reception, awaiting vitals. */
export async function listNurseQueue(
  hospitalId: string,
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .where("date", "==", date)
    .where("status", "==", "CHECKED_IN")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));
}

export async function getAppointment(
  hospitalId: string,
  branchId: string,
  appointmentId: string,
): Promise<AppointmentRecord | null> {
  const doc = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .doc(appointmentId)
    .get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Appointment) };
}

/** Patient's own cross-hospital timeline — the one view that genuinely needs a collectionGroup query. */
export async function listPatientAppointments(patientId: string): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collectionGroup("appointments")
    .where("patientId", "==", patientId)
    .orderBy("date", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }));
}
