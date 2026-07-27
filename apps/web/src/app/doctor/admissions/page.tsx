import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import {
  listActiveAdmissionsForDoctor,
  listPendingBedAssignmentsForDoctor,
} from "@/features/consultations/services/admissions-read";
import { getPatientProfile } from "@/features/patients/services/read";
import { DischargeDialog } from "@/features/consultations/components/DischargeDialog";
import { AssignBedDialog } from "@/features/consultations/components/AssignBedDialog";
import { listBeds, listRooms, listWards } from "@/features/facilities/services/read";

export default async function DoctorAdmissionsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const [admissions, pendingBed, wards] = await Promise.all([
    listActiveAdmissionsForDoctor(doctorId),
    listPendingBedAssignmentsForDoctor(doctorId),
    listWards(branchId),
  ]);
  const withPatients = await Promise.all(
    admissions.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
  );
  const pendingWithPatient = await Promise.all(
    pendingBed.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
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
      <h1 className="text-xl font-semibold text-foreground">Admitted Patients</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting a Bed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pendingWithPatient.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              None of your patients are awaiting a bed.
            </p>
          ) : (
            pendingWithPatient.map(({ admission, patient }) => (
              <div
                key={admission.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{patient?.name ?? "Unknown patient"}</p>
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
          <CardTitle className="text-base">Currently admitted</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {withPatients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients currently admitted.</p>
          ) : (
            withPatients.map(({ admission, patient }) => (
              <div
                key={admission.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{patient?.name ?? "Unknown patient"}</p>
                <DischargeDialog
                  hospitalId={hospitalId}
                  admissionId={admission.id}
                  patientName={patient?.name ?? "this patient"}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
