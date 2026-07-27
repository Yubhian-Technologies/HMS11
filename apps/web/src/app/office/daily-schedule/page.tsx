import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listBranchAppointmentsForDates } from "@/features/appointments/services/read";
import { listStaffByRole } from "@/features/staff/services/read";

const SCHEDULED_STATUSES = new Set(["approved", "checkedIn", "completed"]);
const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };
const SESSION_ORDER: Record<string, number> = { morning: 0, afternoon: 1 };

export default async function DailySchedulePage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const [appointments, doctors] = await Promise.all([
    listBranchAppointmentsForDates(branchId, dates),
    listStaffByRole(hospitalId, "doctor"),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));
  const scheduled = appointments.filter((a) => SCHEDULED_STATUSES.has(a.status));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Daily Schedule</h1>

      {dates.map((date, i) => {
        const daySchedule = scheduled
          .filter((a) => a.date === date)
          .sort((a, b) => (SESSION_ORDER[a.session ?? ""] ?? 2) - (SESSION_ORDER[b.session ?? ""] ?? 2));

        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {daySchedule.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
              ) : (
                daySchedule.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {appt.session ? SESSION_LABEL[appt.session] : "—"} · {appt.patientName}
                      </p>
                      <p className="text-muted-foreground">
                        {doctorName.get(appt.doctorId) ?? "Unknown doctor"}
                        {appt.type === "emergency" ? " · Emergency" : ""}
                      </p>
                    </div>
                    <Badge variant={appt.status === "completed" ? "success" : "default"}>{appt.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
