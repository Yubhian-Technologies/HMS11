import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listHealthUpdates, listMedicineLogs } from "@/features/recovery/services/read";
import { MedicineLogButtons } from "@/features/recovery/components/MedicineLogButtons";
import { SubmitHealthUpdateDialog } from "@/features/recovery/components/SubmitHealthUpdateDialog";

export default async function RecoveryTrackingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [medicineLogs, healthUpdates] = await Promise.all([
    listMedicineLogs(session.uid),
    listHealthUpdates(session.uid),
  ]);
  const pendingLogs = medicineLogs.filter((l) => l.patientStatus === "pending");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Recovery Tracking</h1>
        <SubmitHealthUpdateDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medicine Checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pendingLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending right now.</p>
          ) : (
            pendingLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <span className="text-foreground">{log.scheduledAt.toDate().toISOString().slice(0, 10)}</span>
                <MedicineLogButtons medicineLogId={log.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {healthUpdates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No updates logged yet.</p>
          ) : (
            healthUpdates.map((u) => (
              <div key={u.id} className="rounded-md border border-border p-3 text-sm">
                <Badge variant={u.condition === "worse" ? "destructive" : "default"}>{u.condition}</Badge>
                <p className="mt-1 text-muted-foreground">
                  Pain {u.painLevel}/10
                  {u.bloodPressure ? ` · BP ${u.bloodPressure}` : ""}
                  {u.sugarMgDl ? ` · Sugar ${u.sugarMgDl}` : ""}
                  {u.temperatureC ? ` · Temp ${u.temperatureC}°C` : ""}
                  {u.weightKg ? ` · Weight ${u.weightKg}kg` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
