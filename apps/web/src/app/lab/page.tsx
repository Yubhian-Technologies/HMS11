import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listLabOrdersByBranch } from "@/features/lab/services/read";
import { getPatientProfile } from "@/features/patients/services/read";
import { AdvanceStatusButton } from "@/features/lab/components/AdvanceStatusButton";
import { UploadReportDialog } from "@/features/lab/components/UploadReportDialog";

const COLUMN_LABEL: Record<string, string> = {
  pending: "Pending",
  sampleCollected: "Sample Collected",
  processing: "Processing",
  completed: "Completed",
  verified: "Verified",
  reportUploaded: "Report Uploaded",
};

export default async function LabPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const grouped = await listLabOrdersByBranch(branchId);

  const patientIds = Array.from(new Set(Object.values(grouped).flat().map((order) => order.patientId)));
  const patients = await Promise.all(patientIds.map((id) => getPatientProfile(id)));
  const patientName = new Map(patients.filter(Boolean).map((p) => [p!.id, p!.name]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Order Pipeline</h1>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(COLUMN_LABEL).map(([status, label]) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm">
                {label} ({grouped[status]?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(grouped[status] ?? []).map((order) => (
                <div key={order.id} className="rounded-md border border-border p-2 text-xs">
                  <p className="font-medium text-foreground">{order.testName}</p>
                  <p className="text-muted-foreground">{patientName.get(order.patientId) ?? "Unknown patient"}</p>
                  <Badge variant="default" className="mt-1">
                    {order.status}
                  </Badge>
                  <div className="mt-2 flex flex-col gap-1">
                    {status === "verified" ? (
                      <UploadReportDialog
                        hospitalId={hospitalId}
                        patientId={order.patientId}
                        labOrderId={order.id}
                      />
                    ) : (
                      <AdvanceStatusButton hospitalId={hospitalId} labOrderId={order.id} status={order.status} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
