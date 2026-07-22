import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Ward, Room, Bed } from "@hms/shared";

export type WardRecord = Ward & { id: string };
export type RoomRecord = Room & { id: string };
export type BedRecord = Bed & { id: string };

export async function listWards(branchId: string): Promise<WardRecord[]> {
  const snap = await getAdminDb()
    .collection("wards")
    .where("branchId", "==", branchId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Ward) }));
}

export async function listRooms(wardId: string): Promise<RoomRecord[]> {
  const snap = await getAdminDb()
    .collection("rooms")
    .where("wardId", "==", wardId)
    .orderBy("roomNumber", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Room) }));
}

export async function listBeds(roomId: string): Promise<BedRecord[]> {
  const snap = await getAdminDb()
    .collection("beds")
    .where("roomId", "==", roomId)
    .orderBy("bedNumber", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Bed) }));
}

/** FR-9.5 — bed picker for admission. */
export async function listAvailableBeds(branchId: string): Promise<BedRecord[]> {
  const snap = await getAdminDb()
    .collection("beds")
    .where("branchId", "==", branchId)
    .where("status", "==", "available")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Bed) }));
}

/** Doctor's Room Details module — resolves a bed to its room + ward for display. */
export async function getBedLocation(
  bedId: string,
): Promise<{ bed: BedRecord; room: RoomRecord; ward: WardRecord } | null> {
  const db = getAdminDb();
  const bedDoc = await db.collection("beds").doc(bedId).get();
  if (!bedDoc.exists) return null;
  const bed = { id: bedDoc.id, ...(bedDoc.data() as Bed) };

  const [roomDoc, wardDoc] = await Promise.all([
    db.collection("rooms").doc(bed.roomId).get(),
    db.collection("wards").doc(bed.wardId).get(),
  ]);
  if (!roomDoc.exists || !wardDoc.exists) return null;

  return {
    bed,
    room: { id: roomDoc.id, ...(roomDoc.data() as Room) },
    ward: { id: wardDoc.id, ...(wardDoc.data() as Ward) },
  };
}
