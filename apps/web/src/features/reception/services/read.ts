import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Appointment } from "@hms/shared";

export type AppointmentRecord = Appointment & { id: string };

function sessionOrder(session: Appointment["session"]): number {
  return session === "morning" ? 0 : session === "afternoon" ? 1 : 2;
}

/** Booked (office-approved) appointments today, ready to check in (FR-8.1). */
export async function listReadyForCheckIn(
  hospitalId: string,
  branchId: string,
  date: string,
): Promise<AppointmentRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "appointments"))
    .where("date", "==", date)
    .where("status", "==", "BOOKED")
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Appointment) }))
    .sort((a, b) => sessionOrder(a.session) - sessionOrder(b.session));
}
