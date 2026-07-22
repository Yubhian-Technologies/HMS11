import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listDoctorQueue } from "@/features/appointments/services/read";
import { listLabTests } from "@/features/lab-tests/services/read";
import { listLabOrdersForDoctor, getLabReportForOrder } from "@/features/lab/services/read";
import { AssignLabOrderForm } from "@/features/lab/components/AssignLabOrderForm";

export default async function DoctorLabsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  const today = todayIsoClient();
  const [queue, labTests, labOrders] = await Promise.all([
    listDoctorQueue(doctorId, today),
    listLabTests(branchId),
    // Isolated: a missing/pending composite index on this newer collection
    // must degrade this one section, not crash the whole page.
    listLabOrdersForDoctor(doctorId).catch(() => []),
  ]);

  const ordersWithReports = await Promise.all(
    labOrders.map(async (order) => ({
      order,
      report: order.status === "reportUploaded" ? await getLabReportForOrder(order.id) : null,
    })),
  );

  const patients = Array.from(new Map(queue.map((a) => [a.patientId, a.patientName])).entries()).map(
    ([id, name]) => ({ id, name }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Labs</h1>

      <AssignLabOrderForm
        hospitalId={hospitalId}
        branchId={branchId}
        patients={patients}
        labTests={labTests.filter((t) => t.status === "active").map((t) => ({ id: t.id, name: t.name, price: t.price }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders you&apos;ve assigned</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ordersWithReports.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No lab orders assigned yet.</p>
          ) : (
            ordersWithReports.map(({ order, report }) => (
              <div key={order.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{order.testName}</span>
                  <Badge variant={order.status === "reportUploaded" ? "default" : "destructive"}>
                    {order.status}
                  </Badge>
                </div>
                {report ? (
                  <div className="mt-2 text-muted-foreground">
                    <a href={report.fileUrl} target="_blank" rel="noreferrer" className="underline">
                      View report
                    </a>
                    {report.summaryNotes ? <p className="mt-1">{report.summaryNotes}</p> : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
