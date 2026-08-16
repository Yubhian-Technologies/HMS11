import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listActiveAdmissionsForDoctor } from "@/features/consultations/services/admissions-read";
import { getPatientProfile } from "@/features/patients/services/read";
import { getBedLocation } from "@/features/facilities/services/read";

export default async function DoctorRoomsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const admissions = await listActiveAdmissionsForDoctor(hospitalId, branchId, doctorId);
  const rows = await Promise.all(
    admissions.map(async (admission) => {
      const [patient, location] = await Promise.all([
        getPatientProfile(admission.patientId),
        admission.bedId ? getBedLocation(hospitalId, branchId, admission.bedId) : Promise.resolve(null),
      ]);
      return { admission, patient, location };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Rooms &amp; Beds — My Patients</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currently admitted</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients currently admitted.</p>
          ) : (
            rows.map(({ admission, patient, location }) => (
              <div
                key={admission.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{patient?.name ?? "Unknown patient"}</p>
                <p className="text-muted-foreground">
                  {location
                    ? `${location.ward.name} · Room ${location.room.roomNumber} · Bed ${location.bed.bedNumber}`
                    : "Bed location unavailable"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
