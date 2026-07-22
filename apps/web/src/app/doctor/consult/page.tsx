import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getAppointment } from "@/features/appointments/services/read";
import { getPatientProfile } from "@/features/patients/services/read";
import { getVitalsForAppointment } from "@/features/reception/services/read";
import { getPatientHistory } from "@/features/consultations/services/read";
import { listLabTests } from "@/features/lab-tests/services/read";
import { listDepartments } from "@/features/departments/services/read";
import { listStaffByRole } from "@/features/staff/services/read";
import { listHealthUpdates, listMedicineLogs } from "@/features/recovery/services/read";
import { ConsultationForm } from "@/features/consultations/components/ConsultationForm";

export default async function ConsultPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const { appointmentId } = await searchParams;
  if (!appointmentId) redirect("/doctor");

  const appointment = await getAppointment(appointmentId);
  if (!appointment || appointment.doctorId !== doctorId) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const [patient, vitals, history, labTests, departments, doctors, healthUpdates, medicineLogs] =
    await Promise.all([
      getPatientProfile(appointment.patientId),
      getVitalsForAppointment(appointmentId),
      getPatientHistory(appointment.patientId, hospitalId),
      listLabTests(branchId),
      listDepartments(hospitalId),
      listStaffByRole(hospitalId, "doctor"),
      listHealthUpdates(appointment.patientId),
      listMedicineLogs(appointment.patientId),
    ]);

  const compliance = { taken: 0, missed: 0, skipped: 0, pending: 0 };
  medicineLogs.forEach((l) => compliance[l.patientStatus]++);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{appointment.patientName}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            {patient ? (
              <>
                <p>
                  {patient.gender} · {patient.dob} · blood group {patient.bloodGroup}
                </p>
                <p>Allergies: {patient.allergies || "None recorded"}</p>
                <p>Current medications: {patient.currentMedications || "None recorded"}</p>
                <p>Medical history: {patient.medicalHistory || "None recorded"}</p>
              </>
            ) : (
              <p>No profile on file.</p>
            )}
            {vitals ? (
              <p className="mt-2 text-foreground">
                Vitals: BP {vitals.bloodPressure} · Pulse {vitals.pulse} · Temp {vitals.temperatureC}°C · SpO2{" "}
                {vitals.spo2}% · BMI {vitals.bmi}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {history.consultations.length === 0 ? (
              <p className="text-muted-foreground">No prior consultations at this hospital.</p>
            ) : (
              history.consultations.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2">
                  <p className="font-medium text-foreground">{c.diagnosis}</p>
                  <p className="text-muted-foreground">{c.clinicalNotes}</p>
                </div>
              ))
            )}
            {history.labOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between">
                <span>{o.testName}</span>
                <Badge variant={o.status === "reportUploaded" ? "default" : "destructive"}>{o.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recovery (FR-14.3)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              Compliance: {compliance.taken} taken · {compliance.missed} missed · {compliance.skipped} skipped ·{" "}
              {compliance.pending} pending
            </p>
            {healthUpdates.slice(0, 5).map((u) => (
              <div key={u.id} className="rounded-md border border-border p-2">
                <Badge variant={u.condition === "worse" ? "destructive" : "default"}>{u.condition}</Badge>
                <span className="ml-2 text-muted-foreground">Pain {u.painLevel}/10</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConsultationForm
        hospitalId={hospitalId}
        branchId={branchId}
        appointmentId={appointmentId}
        labTests={labTests.map((t) => ({ id: t.id, name: t.name, price: t.price }))}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        doctors={doctors.filter((d) => d.id !== doctorId).map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
