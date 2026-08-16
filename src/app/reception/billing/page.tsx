import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { todayIsoClient } from "@/lib/rolling-window";
import { listOutstandingInvoicesForBranch, listUnbilledCompletedAppointments } from "@/features/billing/services/read";
import { GenerateInvoiceButton } from "@/features/billing/components/GenerateInvoiceButton";
import { RecordPaymentDialog } from "@/features/billing/components/RecordPaymentDialog";

export default async function ReceptionBillingPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const [unbilled, outstanding] = await Promise.all([
    listUnbilledCompletedAppointments(hospitalId, branchId, todayIsoClient()),
    listOutstandingInvoicesForBranch(hospitalId, branchId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to bill — today</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {unbilled.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing to bill.</p>
          ) : (
            unbilled.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{appt.patientName}</p>
                <GenerateInvoiceButton hospitalId={hospitalId} branchId={branchId} appointmentId={appt.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {outstanding.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing outstanding.</p>
          ) : (
            outstanding.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Total {inv.totalAmount} · Paid {inv.paidAmount}
                  </p>
                  <Badge variant="destructive">{inv.status}</Badge>
                </div>
                <RecordPaymentDialog
                  hospitalId={hospitalId}
                  branchId={branchId}
                  invoiceId={inv.id}
                  outstanding={inv.totalAmount - inv.paidAmount}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
