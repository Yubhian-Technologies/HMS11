import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listDoctorQueue } from "@/features/appointments/services/read";
import { getVitalsForAppointment } from "@/features/reception/services/read";
import { VitalsLiveRefresh } from "@/features/reception/components/VitalsLiveRefresh";

export default async function DoctorQueuePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = todayIsoClient();
  const queue = await listDoctorQueue(session.uid, today);
  const withVitals = await Promise.all(
    queue.map(async (appt) => ({ appt, vitals: await getVitalsForAppointment(appt.id) })),
  );

  return (
    <div className="flex flex-col gap-6">
      {session.hospitalId && session.branchId ? (
        <VitalsLiveRefresh hospitalId={session.hospitalId} branchId={session.branchId} />
      ) : null}
      <h1 className="text-xl font-semibold text-foreground">Queue — Today</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {withVitals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients checked in yet.</p>
          ) : (
            withVitals.map(({ appt, vitals }) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {appt.patientName}{" "}
                    {appt.type === "emergency" ? <Badge variant="destructive">EMERGENCY</Badge> : null}
                    {appt.token ? <Badge variant="default">#{appt.token}</Badge> : null}
                  </p>
                  {vitals ? (
                    <p className="text-muted-foreground">
                      BP {vitals.bloodPressure} · Pulse {vitals.pulse} · Temp {vitals.temperatureC}°C · SpO2{" "}
                      {vitals.spo2}% · BMI {vitals.bmi}
                      {vitals.chiefComplaint ? ` · "${vitals.chiefComplaint}"` : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Waiting on vitals from Reception…</p>
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
                    render={<Link href={`/doctor/prescriptions?appointmentId=${appt.id}`} />}
                  >
                    Prescriptions
                  </Button>
                  <Button size="sm" render={<Link href={`/doctor/labs?appointmentId=${appt.id}`} />}>
                    Labs
                  </Button>
                  <Button size="sm" disabled={!vitals} render={<Link href={`/doctor/consult?appointmentId=${appt.id}`} />}>
                    {vitals ? "Start Consultation" : "Awaiting vitals"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
