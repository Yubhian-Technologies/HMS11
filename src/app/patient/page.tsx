import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getPatientProfile } from "@/features/patients/services/read";
import { EditPatientProfileDialog } from "@/features/patients/components/EditPatientProfileDialog";

export default async function PatientPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const patient = await getPatientProfile(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Welcome{patient ? `, ${patient.name}` : ""}</CardTitle>
          {patient ? (
            <EditPatientProfileDialog
              patient={{
                id: patient.id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                dob: patient.dob,
                phone: patient.phone,
                address: patient.address,
                bloodGroup: patient.bloodGroup,
                emergencyContact: patient.emergencyContact,
                medicalHistory: patient.medicalHistory,
                currentMedications: patient.currentMedications,
                allergies: patient.allergies,
                insurance: patient.insurance,
              }}
            />
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          {patient ? (
            <>
              <p>
                {patient.gender} · {patient.dob} · blood group {patient.bloodGroup}
              </p>
              <p>{patient.phone}</p>
              <p>
                {patient.address.line1}, {patient.address.city}, {patient.address.state}{" "}
                {patient.address.postalCode}
              </p>
            </>
          ) : (
            <p>No profile found for this account.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Appointment booking, timeline, prescriptions, and recovery tracking ship in later modules —
          see docs/18-development-roadmap.md.
        </CardContent>
      </Card>
    </div>
  );
}
