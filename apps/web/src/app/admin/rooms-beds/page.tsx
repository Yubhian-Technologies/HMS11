import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BranchSwitcher } from "@/components/branch-switcher";
import { getSession } from "@/lib/auth/require-role";
import { listBranches } from "@/features/hospitals/services/read";
import { listBeds, listRooms, listWards } from "@/features/facilities/services/read";
import { CreateWardDialog } from "@/features/facilities/components/CreateWardDialog";
import { WardStatusToggle } from "@/features/facilities/components/WardStatusToggle";
import { CreateRoomDialog } from "@/features/facilities/components/CreateRoomDialog";
import { RoomStatusToggle } from "@/features/facilities/components/RoomStatusToggle";
import { CreateBedDialog } from "@/features/facilities/components/CreateBedDialog";
import { BedStatusSelect } from "@/features/facilities/components/BedStatusSelect";

export default async function RoomsBedsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const { branchId: branchIdParam } = await searchParams;
  const branches = await listBranches(hospitalId);
  const branch = branches.find((b) => b.id === branchIdParam) ?? branches[0];

  if (!branch) {
    return <p className="text-sm text-muted-foreground">No branches yet — add one under Hospitals.</p>;
  }

  const wards = await listWards(branch.id);
  const wardsWithRooms = await Promise.all(
    wards.map(async (ward) => {
      const rooms = await listRooms(ward.id);
      const roomsWithBeds = await Promise.all(
        rooms.map(async (room) => ({ room, beds: await listBeds(room.id) })),
      );
      return { ward, roomsWithBeds };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Rooms &amp; Beds</h1>
        <div className="flex items-center gap-2">
          <BranchSwitcher branches={branches} selectedBranchId={branch.id} basePath="/admin/rooms-beds" />
          <CreateWardDialog hospitalId={hospitalId} branchId={branch.id} />
        </div>
      </div>

      {wardsWithRooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No wards yet for {branch.name}.
          </CardContent>
        </Card>
      ) : (
        wardsWithRooms.map(({ ward, roomsWithBeds }) => (
          <Card key={ward.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{ward.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {ward.building} · Floor {ward.floor}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ward.status === "active" ? "default" : "destructive"}>{ward.status}</Badge>
                <WardStatusToggle hospitalId={hospitalId} wardId={ward.id} status={ward.status} />
                <CreateRoomDialog hospitalId={hospitalId} branchId={branch.id} wardId={ward.id} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {roomsWithBeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rooms in this ward yet.</p>
              ) : (
                roomsWithBeds.map(({ room, beds }, i) => (
                  <div key={room.id}>
                    {i > 0 ? <Separator className="mb-4" /> : null}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Room {room.roomNumber}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={room.status === "active" ? "default" : "destructive"}>
                          {room.status}
                        </Badge>
                        <RoomStatusToggle hospitalId={hospitalId} roomId={room.id} status={room.status} />
                        <CreateBedDialog hospitalId={hospitalId} branchId={branch.id} roomId={room.id} />
                      </div>
                    </div>
                    {beds.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No beds in this room yet.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {beds.map((bed) => (
                          <div
                            key={bed.id}
                            className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                          >
                            <span className="font-medium text-foreground">Bed {bed.bedNumber}</span>
                            <BedStatusSelect hospitalId={hospitalId} bedId={bed.id} status={bed.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
