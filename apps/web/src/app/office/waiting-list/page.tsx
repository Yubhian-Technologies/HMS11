import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates } from "@/lib/rolling-window";
import { listBranchAppointmentsForDates } from "@/features/appointments/services/read";
import { listStaffByRole } from "@/features/staff/services/read";

export default async function WaitingListPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const [appointments, doctors] = await Promise.all([
    listBranchAppointmentsForDates(branchId, dates),
    listStaffByRole(hospitalId, "doctor"),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));

  const waiting = appointments
    .filter((a) => a.waitingListPosition != null)
    .sort((a, b) => (a.waitingListPosition ?? 0) - (b.waitingListPosition ?? 0));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Waiting List</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patients waiting for a slot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No one is on the waiting list.</p>
          ) : (
            waiting.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{appt.patientName}</p>
                  <p className="text-muted-foreground">
                    {doctorName.get(appt.doctorId) ?? "Unknown doctor"} · {appt.date}
                  </p>
                </div>
                <Badge variant="default">#{appt.waitingListPosition}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
