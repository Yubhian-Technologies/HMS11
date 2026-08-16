import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Holiday } from "@hms/shared";

export type HolidayRecord = Holiday & { id: string };

export async function listHolidays(hospitalId: string, branchId: string): Promise<HolidayRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "holidays"))
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Holiday) }));
}
