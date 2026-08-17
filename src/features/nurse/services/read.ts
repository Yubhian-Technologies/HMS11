import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Appointment } from "@hms/shared";

export type AppointmentRecord = Appointment & { id: string };

/** Checked-in today, awaiting vitals — Reception's own queue (recordVitals is Reception-only). */
export async function listAwaitingVitals(
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
