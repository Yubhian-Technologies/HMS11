"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { dispenseMedicine } from "../services/pharmacy";

export function DispenseItemDialog({
  hospitalId,
  branchId,
  prescriptionId,
  prescriptionItemIndex,
  medicineName,
  inventory,
}: {
  hospitalId: string;
  branchId: string;
  prescriptionId: string;
  prescriptionItemIndex: number;
  medicineName: string;
  inventory: { id: string; name: string; quantityInStock: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispenseMedicine({
        hospitalId,
        branchId,
        prescriptionId,
        prescriptionItemIndex,
        medicineInventoryItemId: inventoryItemId,
        quantityDispensed: Number(quantity),
      });
      toast.success(`${medicineName} dispensed — reminders scheduled.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Dispense</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Dispense {medicineName}</DialogTitle>
            <DialogDescription>FR-11.2 — decrements inventory and schedules reminders.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="dispense-item">Inventory item</Label>
              <Select
                items={Object.fromEntries(
                  inventory.map((item) => [item.id, `${item.name} (${item.quantityInStock} in stock)`]),
                )}
                value={inventoryItemId}
                onValueChange={(v) => setInventoryItemId(v ?? "")}
              >
                <SelectTrigger id="dispense-item" className="w-full">
                  <SelectValue placeholder="Select inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantityInStock} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dispense-qty">Quantity</Label>
              <Input
                id="dispense-qty"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !inventoryItemId}>
              {submitting ? "Dispensing…" : "Dispense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
