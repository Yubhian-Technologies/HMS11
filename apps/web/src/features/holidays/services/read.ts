import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Holiday } from "@hms/shared";

export type HolidayRecord = Holiday & { id: string };

export async function listHolidays(branchId: string): Promise<HolidayRecord[]> {
  const snap = await getAdminDb()
    .collection("holidays")
    .where("branchId", "==", branchId)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Holiday) }));
}
