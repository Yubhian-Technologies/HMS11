import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getAppointment } from "@/features/appointments/services/read";
import { getPatientProfile } from "@/features/patients/services/read";
import { getPatientHistory, listPastConsultedAppointments } from "@/features/consultations/services/read";
import { getPatientTimeline } from "@/features/timeline/services/read";
import { VitalsLiveRefresh } from "@/features/reception/components/VitalsLiveRefresh";

export default async function PatientDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const { appointmentId } = await searchParams;
  if (!appointmentId) redirect("/doctor");

  const appointment = await getAppointment(hospitalId, branchId, appointmentId);
  if (!appointment || appointment.doctorId !== session.uid) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }
  const vitals = appointment.vitals;

  const [patient, history, pastConsultations, timeline] = await Promise.all([
    getPatientProfile(appointment.patientId),
    getPatientHistory(appointment.patientId, hospitalId),
    listPastConsultedAppointments(appointment.patientId, hospitalId),
    getPatientTimeline(appointment.patientId),
  ]);
  const recoveryEntries = timeline
    .filter((e) => e.type === "medicineLog" || e.type === "healthUpdate")
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <VitalsLiveRefresh hospitalId={hospitalId} branchId={branchId} appointmentId={appointmentId} />
      <h1 className="text-xl font-semibold text-foreground">Patient Details</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{patient?.name ?? appointment.patientName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          {patient ? (
            <>
              <p>
                DOB {patient.dob} · Age {patient.age} · {patient.gender} · blood group {patient.bloodGroup}
              </p>
              <p>Phone: {patient.phone}</p>
            </>
          ) : (
            <p>No profile on file.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Present Vitals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {vitals ? (
            <p>
              Height {vitals.heightCm} cm · Weight {vitals.weightKg} kg · BP {vitals.bloodPressure} ·
              Temperature {vitals.temperatureC}°C
              <br />
              Pulse {vitals.pulse} · SpO2 {vitals.spo2}% · Sugar {vitals.sugarMgDl} mg/dL · BMI {vitals.bmi}
              {vitals.chiefComplaint ? (
                <>
                  <br />
                  Chief complaint: &quot;{vitals.chiefComplaint}&quot;
                </>
              ) : null}
            </p>
          ) : (
            <p>Waiting on vitals from Reception…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous Medical History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          <p>Medical history: {patient?.medicalHistory || "None recorded"}</p>
          <p>Current medications: {patient?.currentMedications || "None recorded"}</p>
          <p>Allergies: {patient?.allergies || "None recorded"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {history.prescriptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No prior prescriptions on file.</p>
          ) : (
            history.prescriptions.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3 text-sm">
                {p.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-foreground">{item.medicineName}</span>
                    <span className="text-muted-foreground">
                      {item.dosage} · {item.frequency} · {item.durationDays} days
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Consultations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pastConsultations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No prior consultations at this hospital.</p>
          ) : (
            pastConsultations.map((c) => (
              <div key={c.appointmentId} className="rounded-md border border-border p-2 text-sm">
                <p className="font-medium text-foreground">{c.diagnosis}</p>
                <p className="text-muted-foreground">{c.clinicalNotes}</p>
              </div>
            ))
          )}
          {history.labOrders.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{o.testName}</span>
              <Badge variant={o.status === "reportUploaded" ? "default" : "destructive"}>{o.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recovery &amp; Medicine Compliance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recoveryEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recovery updates or dose logs from the patient yet.
            </p>
          ) : (
            recoveryEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{entry.title}</p>
                  {entry.description ? <p className="text-muted-foreground">{entry.description}</p> : null}
                </div>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
