import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPatientAppointments } from "@/features/appointments/services/read";

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

export default async function PatientAppointmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const appointments = await listPatientAppointments(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">My Appointments</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No appointments yet —{" "}
              <a href="/patient/book" className="underline underline-offset-4">
                book one
              </a>
              .
            </p>
          ) : (
            appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {appt.date} {appt.session ? `· ${SESSION_LABEL[appt.session]}` : "(waiting list)"}
                  </p>
                  <p className="text-muted-foreground">
                    {appt.type === "emergency" ? "Emergency" : "Consultation"}
                    {appt.waitingListPosition ? ` · waiting list #${appt.waitingListPosition}` : ""}
                  </p>
                </div>
                <Badge variant={appt.status === "BOOKED" ? "default" : "destructive"}>{appt.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
