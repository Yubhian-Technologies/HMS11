import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPrescriptionsForBranch, listDispensesForPrescription } from "@/features/pharmacy/services/read";
import { listMedicineInventory } from "@/features/medicine-inventory/services/read";
import { listMedicineOrdersForBranch } from "@/features/doctor-medicine-orders/services/read";
import { getPatientProfile } from "@/features/patients/services/read";
import { DispenseItemDialog } from "@/features/pharmacy/components/DispenseItemDialog";

export default async function PharmacyPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const [prescriptions, inventory, doctorMedicineOrders] = await Promise.all([
    listPrescriptionsForBranch(hospitalId, branchId),
    listMedicineInventory(hospitalId, branchId),
    // Isolated: a missing/pending composite index on this newer collection
    // must degrade this one section, not crash the whole page.
    listMedicineOrdersForBranch(hospitalId, branchId).catch(() => []),
  ]);

  const orderPatientIds = Array.from(new Set(doctorMedicineOrders.map((o) => o.patientId)));
  const orderPatients = await Promise.all(orderPatientIds.map((id) => getPatientProfile(id)));
  const patientNameById = new Map(orderPatients.filter(Boolean).map((p) => [p!.id, p!.name]));

  const prescriptionsWithDispenses = await Promise.all(
    prescriptions.map(async (p) => ({
      prescription: p,
      dispenses: await listDispensesForPrescription(hospitalId, branchId, p.id),
    })),
  );

  const activeInventory = inventory.filter((i) => i.status === "active");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Prescription Queue</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor-Assigned Medicine — Awaiting Dosage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Assigned from the doctor&apos;s Prescriptions module — medicine and duration only. Set dosage,
            frequency, and dispense from the consult-based Prescription Queue below once ready.
          </p>
          {doctorMedicineOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing assigned yet.</p>
          ) : (
            doctorMedicineOrders.map((order) => (
              <div key={order.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium text-foreground">
                  {patientNameById.get(order.patientId) ?? "Unknown patient"}
                </p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-muted-foreground">
                    <span>{item.medicineName}</span>
                    <span>{item.durationDays} days</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {prescriptionsWithDispenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No prescriptions yet.
          </CardContent>
        </Card>
      ) : (
        prescriptionsWithDispenses.map(({ prescription, dispenses }) => (
          <Card key={prescription.id}>
            <CardHeader>
              <CardTitle className="text-base">Prescription — {prescription.id.slice(0, 8)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {prescription.items.map((item, i) => {
                const dispensed = dispenses.some((d) => d.prescriptionItemIndex === i);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.medicineName}</p>
                      <p className="text-muted-foreground">
                        {item.dosage} · {item.frequency} · {item.durationDays} days
                        {item.instructions ? ` · ${item.instructions}` : ""}
                      </p>
                    </div>
                    {dispensed ? (
                      <Badge variant="default">Dispensed</Badge>
                    ) : (
                      <DispenseItemDialog
                        hospitalId={hospitalId}
                        branchId={branchId}
                        prescriptionId={prescription.id}
                        prescriptionItemIndex={i}
                        medicineName={item.medicineName}
                        inventory={activeInventory.map((inv) => ({
                          id: inv.id,
                          name: inv.name,
                          quantityInStock: inv.quantityInStock,
                        }))}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
