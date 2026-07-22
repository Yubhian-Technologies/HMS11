import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchSwitcher } from "@/components/branch-switcher";
import { getSession } from "@/lib/auth/require-role";
import { listBranches } from "@/features/hospitals/services/read";
import { listMedicineInventory } from "@/features/medicine-inventory/services/read";
import { MedicineInventoryFormDialog } from "@/features/medicine-inventory/components/MedicineInventoryFormDialog";
import { MedicineInventoryStatusToggle } from "@/features/medicine-inventory/components/MedicineInventoryStatusToggle";

export default async function MedicineInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const { branchId: branchIdParam } = await searchParams;
  const branches = await listBranches(hospitalId);
  const branch = branches.find((b) => b.id === branchIdParam) ?? branches[0];

  if (!branch) {
    return <p className="text-sm text-muted-foreground">No branches yet — add one under Hospitals.</p>;
  }

  const items = await listMedicineInventory(branch.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Medicine Inventory</h1>
        <div className="flex items-center gap-2">
          <BranchSwitcher
            branches={branches}
            selectedBranchId={branch.id}
            basePath="/admin/medicine-inventory"
          />
          <MedicineInventoryFormDialog hospitalId={hospitalId} branchId={branch.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory — {branch.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No inventory items yet.</p>
          ) : (
            items.map((item) => {
              const lowStock = item.quantityInStock <= item.reorderLevel;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-muted-foreground">
                      Batch {item.batchNumber} · exp {item.expiryDate} · unit price {item.unitPrice}
                    </p>
                    <p className={lowStock ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {item.quantityInStock} in stock (reorder at {item.reorderLevel})
                      {lowStock ? " — low stock" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === "active" ? "default" : "destructive"}>{item.status}</Badge>
                    <MedicineInventoryFormDialog
                      hospitalId={hospitalId}
                      branchId={branch.id}
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
