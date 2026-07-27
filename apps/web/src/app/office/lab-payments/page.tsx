import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPendingPaymentLabOrders } from "@/features/lab/services/read";
import { MarkLabOrderPaidButton } from "@/features/lab/components/MarkLabOrderPaidButton";

export default async function OfficeLabPaymentsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const orders = await listPendingPaymentLabOrders(hospitalId, branchId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Lab Order Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No lab orders awaiting payment.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <span className="font-medium text-foreground">{order.testName}</span>
                <MarkLabOrderPaidButton hospitalId={hospitalId} branchId={branchId} labOrderId={order.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
