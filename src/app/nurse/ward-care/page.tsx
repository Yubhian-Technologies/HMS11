import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listActiveAdmissionsForNurse } from "@/features/consultations/services/admissions-read";
import { getPatientProfile } from "@/features/patients/services/read";
import { UpdateWardCareDialog } from "@/features/nurse/components/UpdateWardCareDialog";

export default async function NurseWardCarePage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: nurseId } = session;

  const admissions = await listActiveAdmissionsForNurse(hospitalId, branchId, nurseId);
  const withPatients = await Promise.all(
    admissions.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Ward Care — My Patients</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currently in your care</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {withPatients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No patients currently assigned to you.
            </p>
          ) : (
            withPatients.map(({ admission, patient }) => (
              <div
                key={admission.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{patient?.name ?? "Unknown patient"}</p>
                  <p className="text-muted-foreground">{admission.careNotes ?? "No note yet"}</p>
                </div>
                <UpdateWardCareDialog
                  hospitalId={hospitalId}
                  branchId={branchId}
                  admissionId={admission.id}
                  patientName={patient?.name ?? "this patient"}
                  currentNotes={admission.careNotes}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
