import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listActiveAdmissionsForDoctor } from "@/features/consultations/services/admissions-read";
import { getPatientProfile } from "@/features/patients/services/read";
import { DischargeDialog } from "@/features/consultations/components/DischargeDialog";

export default async function DoctorAdmissionsPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");
  const { hospitalId, uid: doctorId } = session;

  const admissions = await listActiveAdmissionsForDoctor(doctorId);
  const withPatients = await Promise.all(
    admissions.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Admitted Patients</h1>
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
                <p className="font-medium text-foreground">{patient?.name ?? admission.patientId}</p>
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
