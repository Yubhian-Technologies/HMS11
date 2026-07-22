import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listMedicineInventory } from "@/features/medicine-inventory/services/read";
import { MedicineInventoryFormDialog } from "@/features/medicine-inventory/components/MedicineInventoryFormDialog";
import { MedicineInventoryStatusToggle } from "@/features/medicine-inventory/components/MedicineInventoryStatusToggle";
import { getExpiryStatus } from "@/features/medicine-inventory/expiry";

export default async function PharmacyInventoryPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const items = await listMedicineInventory(branchId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
        <MedicineInventoryFormDialog hospitalId={hospitalId} branchId={branchId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No inventory items yet.</p>
          ) : (
            items.map((item) => {
              const lowStock = item.quantityInStock <= item.reorderLevel;
              const expiryStatus = getExpiryStatus(item.expiryDate);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className={expiryStatus !== "ok" ? "font-medium text-destructive" : "text-muted-foreground"}>
                      Batch {item.batchNumber} · exp {item.expiryDate} · unit price {item.unitPrice}
                      {expiryStatus === "expired" ? " — expired" : expiryStatus === "nearExpiry" ? " — near expiry" : ""}
                    </p>
                    <p className={lowStock ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {item.quantityInStock} in stock (reorder at {item.reorderLevel})
                      {lowStock ? " — low stock" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {expiryStatus !== "ok" ? (
                      <Badge variant="destructive" className="w-24 justify-center">
                        {expiryStatus === "expired" ? "Expired" : "Near expiry"}
                      </Badge>
                    ) : null}
                    <Badge variant={item.status === "active" ? "success" : "destructive"} className="w-20 justify-center">{item.status}</Badge>
                    <MedicineInventoryFormDialog
                      hospitalId={hospitalId}
                      branchId={branchId}
                      existing={{
                        id: item.id,
                        name: item.name,
                        batchNumber: item.batchNumber,
                        expiryDate: item.expiryDate,
                        quantityInStock: item.quantityInStock,
                        reorderLevel: item.reorderLevel,
                        unitPrice: item.unitPrice,
                      }}
                    />
                    <MedicineInventoryStatusToggle hospitalId={hospitalId} itemId={item.id} status={item.status} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
