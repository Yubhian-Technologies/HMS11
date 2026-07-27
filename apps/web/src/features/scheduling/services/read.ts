import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { doctorCollection, type DoctorAvailabilityTemplate, type DoctorSlot } from "@hms/shared";

export type TemplateRecord = DoctorAvailabilityTemplate & { id: string };
export type SlotRecord = DoctorSlot & { id: string };

export async function listTemplatesForDoctor(
  hospitalId: string,
  branchId: string,
  doctorId: string,
): Promise<TemplateRecord[]> {
  const snap = await getAdminDb()
    .collection(doctorCollection(hospitalId, branchId, doctorId, "availabilityTemplates"))
    .orderBy("weekday", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorAvailabilityTemplate) }));
}

const SESSION_ORDER: Record<string, number> = { morning: 0, afternoon: 1 };

function sortSlots(slots: SlotRecord[]): SlotRecord[] {
  return slots.sort((a, b) =>
    a.date === b.date ? SESSION_ORDER[a.session]! - SESSION_ORDER[b.session]! : a.date.localeCompare(b.date),
  );
}

export async function listSlotsForDoctorInRange(
  hospitalId: string,
  branchId: string,
  doctorId: string,
  dates: string[],
): Promise<SlotRecord[]> {
  if (dates.length === 0) return [];
  const snap = await getAdminDb()
    .collection(doctorCollection(hospitalId, branchId, doctorId, "slots"))
    .where("date", "in", dates)
    .get();
  return sortSlots(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorSlot) })));
}

/**
 * Office's branch-wide view across every doctor — `slots` is nested per
 * doctor now, so this is the one query in this file that needs a
 * `collectionGroup()` scan, filtered back down to the branch via the
 * denormalized `branchId` field (see firestore.indexes.json's
 * `slots` collection-group index).
 */
export async function listSlotsForBranchInRange(
  hospitalId: string,
  branchId: string,
  dates: string[],
): Promise<SlotRecord[]> {
  if (dates.length === 0) return [];
  const snap = await getAdminDb()
    .collectionGroup("slots")
    .where("branchId", "==", branchId)
    .where("date", "in", dates)
    .get();
  return sortSlots(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorSlot) })));
}
