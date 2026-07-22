"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignMedicineOrder } from "../services/doctorMedicineOrders";

interface ItemForm {
  medicineInventoryId: string;
  medicineName: string;
  durationDays: string;
}

export function AssignMedicineOrderForm({
  hospitalId,
  branchId,
  patientId,
  inventory,
}: {
  hospitalId: string;
  branchId: string;
  patientId: string;
  inventory: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ItemForm[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, { medicineInventoryId: "", medicineName: "", durationDays: "" }]);
  }
  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function selectMedicine(index: number, medicineInventoryId: string) {
    const medicine = inventory.find((m) => m.id === medicineInventoryId);
    updateItem(index, { medicineInventoryId, medicineName: medicine?.name ?? "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignMedicineOrder({
        hospitalId,
        branchId,
        patientId,
        items: items.map((it) => ({ ...it, durationDays: Number(it.durationDays) })),
      });
      toast.success("Medicine assigned.");
      setItems([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign medicine.");
    } finally {
      setSubmitting(false);
    }
  }

  const valid = items.length > 0 && items.every((it) => it.medicineInventoryId && it.durationDays);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Assign Medicine</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          Add Medicine
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines added.</p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 rounded-md border border-border p-3">
                <Select value={item.medicineInventoryId} onValueChange={(v) => selectMedicine(i, v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Duration (days)"
                  required
                  value={item.durationDays}
                  onChange={(e) => updateItem(i, { durationDays: e.target.value })}
                />
                <Button type="button" size="sm" variant="destructive" onClick={() => removeItem(i)}>
                  Remove
                </Button>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            Dosage and timing are set by Pharmacy — this only records which medicine and for how long.
          </p>
          <Button type="submit" disabled={submitting || !valid} className="self-start">
            {submitting ? "Assigning…" : "Assign Medicine"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
