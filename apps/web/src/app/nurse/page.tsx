import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listAwaitingVitals } from "@/features/nurse/services/read";
import { RecordVitalsDialog } from "@/features/nurse/components/RecordVitalsDialog";

export default async function NursePage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const today = todayIsoClient();
  const awaitingVitals = await listAwaitingVitals(hospitalId, branchId, today);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Nurse Queue — Today</h1>

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
                    {appt.patientName}{" "}
                    {appt.checkIn?.token ? <Badge variant="default">#{appt.checkIn.token}</Badge> : null}
                  </p>
                  <p className="text-muted-foreground">
                    {appt.type === "emergency" ? "Emergency" : appt.session ? appt.session : "—"}
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
