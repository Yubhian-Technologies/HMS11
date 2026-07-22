import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listAwaitingVitals, listReadyForCheckIn } from "@/features/reception/services/read";
import { CheckInButton } from "@/features/reception/components/CheckInButton";
import { RecordVitalsDialog } from "@/features/reception/components/RecordVitalsDialog";

export default async function ReceptionPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const today = todayIsoClient();
  const [readyForCheckIn, awaitingVitals] = await Promise.all([
    listReadyForCheckIn(branchId, today),
    listAwaitingVitals(branchId, today),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Front Desk — Today</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to check in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {readyForCheckIn.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting.</p>
          ) : (
            readyForCheckIn.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{appt.patientName}</p>
                  <p className="text-muted-foreground">{appt.startTime ?? "—"}</p>
                </div>
                <CheckInButton hospitalId={hospitalId} branchId={branchId} appointmentId={appt.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checked in — awaiting vitals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {awaitingVitals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting.</p>
          ) : (
            awaitingVitals.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {appt.patientName} {appt.token ? <Badge variant="default">#{appt.token}</Badge> : null}
                  </p>
                  <p className="text-muted-foreground">
                    {appt.type === "emergency" ? "Emergency" : appt.startTime ?? "—"}
                  </p>
                </div>
                <RecordVitalsDialog
                  hospitalId={hospitalId}
                  branchId={branchId}
                  appointmentId={appt.id}
                  patientName={appt.patientName}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
