import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import {
  listActiveAdmissionsForDoctor,
  listPendingBedAssignmentsForDoctor,
} from "@/features/consultations/services/admissions-read";
import { getPatientProfile } from "@/features/patients/services/read";
import { DischargeDialog } from "@/features/consultations/components/DischargeDialog";

/**
 * Bed allocation is Office's job (Phase D Branch 1), not the doctor's — the
 * doctor only flagged the admission request via submitConsultation. This
 * page is read-only for the "awaiting a bed" list; discharge stays a
 * doctor action.
 */
export default async function DoctorAdmissionsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const [admissions, pendingBed] = await Promise.all([
    listActiveAdmissionsForDoctor(hospitalId, branchId, doctorId),
    listPendingBedAssignmentsForDoctor(hospitalId, branchId, doctorId),
  ]);
  const withPatients = await Promise.all(
    admissions.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
  );
  const pendingWithPatient = await Promise.all(
    pendingBed.map(async (a) => ({ admission: a, patient: await getPatientProfile(a.patientId) })),
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
                <span className="text-muted-foreground">Awaiting Office bed assignment</span>
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
                  branchId={branchId}
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
