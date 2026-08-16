import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listLabOrdersForDoctor, getLabReportForOrder } from "@/features/lab/services/read";

/**
 * Read-only — lab orders originate only from the consult flow
 * (submitConsultation) now, not from a standalone "assign a test" action
 * here, so a doctor can't create two lab orders for the same visit through
 * two different paths. This page is where a doctor checks status/results.
 */
export default async function DoctorLabsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId, uid: doctorId } = session;

  // Isolated: a missing/pending composite index on this newer collection
  // must degrade this section, not crash the whole page.
  const labOrders = await listLabOrdersForDoctor(hospitalId, branchId, doctorId).catch(() => []);

  const ordersWithReports = await Promise.all(
    labOrders.map(async (order) => ({
      order,
      report: order.status === "reportUploaded" ? await getLabReportForOrder(hospitalId, branchId, order.id) : null,
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Labs</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Lab Orders</CardTitle>
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
