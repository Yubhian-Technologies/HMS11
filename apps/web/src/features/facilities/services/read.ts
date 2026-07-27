import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { branchCollection, type Ward, type Room, type Bed } from "@hms/shared";

export type WardRecord = Ward & { id: string };
export type RoomRecord = Room & { id: string };
export type BedRecord = Bed & { id: string };

export async function listWards(hospitalId: string, branchId: string): Promise<WardRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "wards"))
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Ward) }));
}

export async function listRooms(hospitalId: string, branchId: string, wardId: string): Promise<RoomRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "rooms"))
    .where("wardId", "==", wardId)
    .orderBy("roomNumber", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Room) }));
}

export async function listBeds(hospitalId: string, branchId: string, roomId: string): Promise<BedRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "beds"))
    .where("roomId", "==", roomId)
    .orderBy("bedNumber", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Bed) }));
}

/** FR-9.5 — bed picker for admission. */
export async function listAvailableBeds(hospitalId: string, branchId: string): Promise<BedRecord[]> {
  const snap = await getAdminDb()
    .collection(branchCollection(hospitalId, branchId, "beds"))
    .where("status", "==", "available")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Bed) }));
}

/** Doctor's Room Details module — resolves a bed to its room + ward for display. */
export async function getBedLocation(
  hospitalId: string,
  branchId: string,
  bedId: string,
): Promise<{ bed: BedRecord; room: RoomRecord; ward: WardRecord } | null> {
  const db = getAdminDb();
  const bedDoc = await db.collection(branchCollection(hospitalId, branchId, "beds")).doc(bedId).get();
  if (!bedDoc.exists) return null;
  const bed = { id: bedDoc.id, ...(bedDoc.data() as Bed) };

  const [roomDoc, wardDoc] = await Promise.all([
    db.collection(branchCollection(hospitalId, branchId, "rooms")).doc(bed.roomId).get(),
    db.collection(branchCollection(hospitalId, branchId, "wards")).doc(bed.wardId).get(),
  ]);
  if (!roomDoc.exists || !wardDoc.exists) return null;

  return {
    bed,
    room: { id: roomDoc.id, ...(roomDoc.data() as Room) },
    ward: { id: wardDoc.id, ...(wardDoc.data() as Ward) },
  };
}
