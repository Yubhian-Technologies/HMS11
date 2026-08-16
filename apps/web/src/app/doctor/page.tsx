import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listDoctorQueue } from "@/features/appointments/services/read";
import { StartConsultationButton } from "@/features/appointments/components/StartConsultationButton";
import { VitalsLiveRefresh } from "@/features/reception/components/VitalsLiveRefresh";

export default async function DoctorQueuePage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const today = todayIsoClient();
  const queue = await listDoctorQueue(hospitalId, branchId, doctorId, today);

  return (
    <div className="flex flex-col gap-6">
      <VitalsLiveRefresh hospitalId={hospitalId} branchId={branchId} doctorId={doctorId} />
      <h1 className="text-xl font-semibold text-foreground">Queue — Today</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients with vitals recorded yet.</p>
          ) : (
            queue.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {appt.patientName}{" "}
                    {appt.type === "emergency" ? <Badge variant="destructive">EMERGENCY</Badge> : null}
                    {appt.checkIn?.token ? <Badge variant="default">#{appt.checkIn.token}</Badge> : null}
                    {appt.status === "CONSULTING" ? <Badge variant="secondary">In Consultation</Badge> : null}
                  </p>
                  {appt.vitals ? (
                    <p className="text-muted-foreground">
                      BP {appt.vitals.bloodPressure} · Pulse {appt.vitals.pulse} · Temp {appt.vitals.temperatureC}°C ·
                      SpO2 {appt.vitals.spo2}% · BMI {appt.vitals.bmi}
                      {appt.vitals.chiefComplaint ? ` · "${appt.vitals.chiefComplaint}"` : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Waiting on vitals from Nurse…</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/doctor/patient-details?appointmentId=${appt.id}`} />}
                  >
                    Patient Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/doctor/admissions`} />}
                  >
                    Admissions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/doctor/prescriptions?appointmentId=${appt.id}`} />}
                  >
                    Prescriptions
                  </Button>
                  <Button size="sm" variant="outline" render={<Link href={`/doctor/labs?appointmentId=${appt.id}`} />}>
                    Labs
                  </Button>
                  {appt.status === "CONSULTING" ? (
                    <Button size="sm" render={<Link href={`/doctor/consult?appointmentId=${appt.id}`} />}>
                      Resume Consultation
                    </Button>
                  ) : (
                    <StartConsultationButton
                      hospitalId={hospitalId}
                      branchId={branchId}
                      appointmentId={appt.id}
                      hasVitals={Boolean(appt.vitals)}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
