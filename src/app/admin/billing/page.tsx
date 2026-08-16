import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listOutstandingInvoicesForHospital } from "@/features/billing/services/read";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile, StatTileRow } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { INVOICE_STATUS_META, fallbackStatusMeta } from "@/lib/status-meta";

export default async function AdminBillingPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");
  const { hospitalId } = session;

  const outstanding = await listOutstandingInvoicesForHospital(hospitalId);
  const totalDue = outstanding.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing Overview" />

      <StatTileRow>
        <StatTile icon={Receipt} label="Total Due (FR-15.4)" value={totalDue} tone="warning" />
        <StatTile icon={Receipt} label="Outstanding Invoices" value={outstanding.length} tone="neutral" />
      </StatTileRow>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unpaid &amp; partial invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {outstanding.length === 0 ? (
            <EmptyState icon={Receipt} message="No outstanding invoices." />
          ) : (
            outstanding.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="text-foreground">
                  Total {inv.totalAmount} · Paid {inv.paidAmount} · Due {inv.totalAmount - inv.paidAmount}
                </p>
                <StatusBadge {...(INVOICE_STATUS_META[inv.status] ?? fallbackStatusMeta(inv.status))} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
