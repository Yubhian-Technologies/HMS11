import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listOutstandingInvoicesForHospital } from "@/features/billing/services/read";

export default async function AdminBillingPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");
  const { hospitalId } = session;

  const outstanding = await listOutstandingInvoicesForHospital(hospitalId);
  const totalDue = outstanding.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Billing Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding dues (FR-15.4)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-foreground">{totalDue}</p>
          <p className="text-sm text-muted-foreground">across {outstanding.length} invoices</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unpaid &amp; partial invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {outstanding.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No outstanding invoices.</p>
          ) : (
            outstanding.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="text-foreground">
                  Total {inv.totalAmount} · Paid {inv.paidAmount} · Due {inv.totalAmount - inv.paidAmount}
                </p>
                <Badge variant="destructive">{inv.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
