import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listWalkInPatients } from "@/features/patients/services/read";
import { CreateWalkInPatientDialog } from "@/features/patients/components/CreateWalkInPatientDialog";

export default async function ReceptionPatientsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const patients = await listWalkInPatients(hospitalId, branchId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Patients</h1>
        <CreateWalkInPatientDialog hospitalId={hospitalId} branchId={branchId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recently registered</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {patients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No walk-in patients registered yet.
            </p>
          ) : (
            patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-muted-foreground">
                    {patient.phone} · {patient.gender} · {patient.dob} · {patient.bloodGroup}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/reception/book?patientId=${patient.id}`} />}
                >
                  Book Appointment
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
