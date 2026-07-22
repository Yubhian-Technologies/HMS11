import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { DoctorAvailabilityTemplate, DoctorSlot } from "@hms/shared";

export type TemplateRecord = DoctorAvailabilityTemplate & { id: string };
export type SlotRecord = DoctorSlot & { id: string };

export async function listTemplatesForDoctor(doctorId: string): Promise<TemplateRecord[]> {
  const snap = await getAdminDb()
    .collection("doctorAvailabilityTemplates")
    .where("doctorId", "==", doctorId)
    .orderBy("weekday", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorAvailabilityTemplate) }));
}

function sortSlots(slots: SlotRecord[]): SlotRecord[] {
  return slots.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
}

export async function listSlotsForDoctorInRange(doctorId: string, dates: string[]): Promise<SlotRecord[]> {
  if (dates.length === 0) return [];
  const snap = await getAdminDb()
    .collection("doctorSlots")
    .where("doctorId", "==", doctorId)
    .where("date", "in", dates)
    .get();
  return sortSlots(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorSlot) })));
}

export async function listSlotsForBranchInRange(branchId: string, dates: string[]): Promise<SlotRecord[]> {
  if (dates.length === 0) return [];
  const snap = await getAdminDb()
    .collection("doctorSlots")
    .where("branchId", "==", branchId)
    .where("date", "in", dates)
    .get();
  return sortSlots(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as DoctorSlot) })));
}
