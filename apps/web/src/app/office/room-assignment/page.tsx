import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPendingBedAssignments } from "@/features/consultations/services/admissions-read";
import { AssignBedDialog } from "@/features/consultations/components/AssignBedDialog";
import { getPatientProfile } from "@/features/patients/services/read";
import { listStaffByRole } from "@/features/staff/services/read";
import { listBeds, listRooms, listWards } from "@/features/facilities/services/read";
import { BedStatusSelect } from "@/features/facilities/components/BedStatusSelect";

export default async function OfficeRoomAssignmentPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const [pending, doctors, wards] = await Promise.all([
    // Isolated: a missing/pending composite index must degrade this
    // section, not crash the whole page.
    listPendingBedAssignments(branchId).catch(() => []),
    listStaffByRole(hospitalId, "doctor"),
    listWards(branchId),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));

  const pendingWithPatient = await Promise.all(
    pending.map(async (admission) => ({ admission, patient: await getPatientProfile(admission.patientId) })),
  );

  const wardsWithRooms = await Promise.all(
    wards.map(async (ward) => {
      const rooms = await listRooms(ward.id);
      const roomsWithBeds = await Promise.all(
        rooms.map(async (room) => ({ room, beds: await listBeds(room.id) })),
      );
      return { ward, roomsWithBeds };
    }),
  );

  const availableBedOptions = wardsWithRooms.flatMap(({ ward, roomsWithBeds }) =>
    roomsWithBeds.flatMap(({ room, beds }) =>
      beds
        .filter((b) => b.status === "available")
        .map((b) => ({ id: b.id, label: `${ward.name} · Room ${room.roomNumber} · Bed ${b.bedNumber}` })),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Room Assignment</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting a Bed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pendingWithPatient.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing awaiting a bed.</p>
          ) : (
            pendingWithPatient.map(({ admission, patient }) => (
              <div
                key={admission.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{patient?.name ?? "Unknown patient"}</p>
                  <p className="text-muted-foreground">
                    Requested by {doctorName.get(admission.doctorId) ?? "Unknown doctor"}
                  </p>
                </div>
                <AssignBedDialog
                  hospitalId={hospitalId}
                  branchId={branchId}
                  admissionId={admission.id}
                  beds={availableBedOptions}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage Bed Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {wardsWithRooms.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No wards set up for this branch yet.</p>
          ) : (
            wardsWithRooms.map(({ ward, roomsWithBeds }) => (
              <div key={ward.id}>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {ward.name} <span className="text-muted-foreground">· {ward.building}, Floor {ward.floor}</span>
                </p>
                {roomsWithBeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rooms in this ward yet.</p>
                ) : (
                  roomsWithBeds.map(({ room, beds }) => (
                    <div key={room.id} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Room {room.roomNumber}:</span>
                      {beds.length === 0 ? (
                        <Badge variant="outline">No beds</Badge>
                      ) : (
                        beds.map((bed) => (
                          <div key={bed.id} className="flex items-center gap-1 rounded-md border border-border p-1.5">
                            <span className="text-foreground">Bed {bed.bedNumber}</span>
                            <BedStatusSelect hospitalId={hospitalId} bedId={bed.id} status={bed.status} />
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
