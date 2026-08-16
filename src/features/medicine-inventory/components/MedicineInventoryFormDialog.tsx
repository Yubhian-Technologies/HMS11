"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createMedicineInventoryItem, updateMedicineInventoryItem } from "../services/medicineInventory";
import type { MedicineInventoryRecord } from "../services/read";

// Only the editable-form fields — a Server Component can't pass a raw
// Firestore Timestamp (createdAt/updatedAt) to a Client Component.
type EditableMedicineInventoryItem = Pick<
  MedicineInventoryRecord,
  "id" | "name" | "batchNumber" | "expiryDate" | "quantityInStock" | "reorderLevel" | "unitPrice"
>;

export function MedicineInventoryFormDialog({
  hospitalId,
  branchId,
  existing,
}: {
  hospitalId: string;
  branchId: string;
  existing?: EditableMedicineInventoryItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const emptyForm = {
    name: existing?.name ?? "",
    batchNumber: existing?.batchNumber ?? "",
    expiryDate: existing?.expiryDate ?? "",
    quantityInStock: existing ? String(existing.quantityInStock) : "",
    reorderLevel: existing ? String(existing.reorderLevel) : "",
    unitPrice: existing ? String(existing.unitPrice) : "",
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // The dialog stays mounted between opens (just hidden), so without this the
  // form keeps whatever was last typed — including a previous "New Item"
  // submission's values leaking into the next one. Reset from fresh values
  // every time it opens, not just once at mount.
  function handleOpenChange(next: boolean) {
    if (next) setForm(emptyForm);
    setOpen(next);
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (existing) {
        await updateMedicineInventoryItem({
          hospitalId,
          branchId,
          itemId: existing.id,
          batchNumber: form.batchNumber,
          expiryDate: form.expiryDate,
          quantityInStock: Number(form.quantityInStock),
          reorderLevel: Number(form.reorderLevel),
          unitPrice: Number(form.unitPrice),
        });
        toast.success(`"${form.name}" updated.`);
      } else {
        await createMedicineInventoryItem({
          hospitalId,
          branchId,
          name: form.name,
          batchNumber: form.batchNumber,
          expiryDate: form.expiryDate,
          quantityInStock: Number(form.quantityInStock),
          reorderLevel: Number(form.reorderLevel),
          unitPrice: Number(form.unitPrice),
        });
        toast.success(`"${form.name}" added to inventory.`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save inventory item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={existing ? "outline" : "default"} size="sm" />}>
        {existing ? "Edit" : "New Item"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{existing ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>FR-3.6.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="med-name">Medicine name</Label>
              <Input id="med-name" required disabled={Boolean(existing)} {...field("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="med-batch">Batch number</Label>
                <Input id="med-batch" required {...field("batchNumber")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="med-expiry">Expiry date</Label>
                <Input id="med-expiry" type="date" required {...field("expiryDate")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="med-qty">Quantity</Label>
                <Input id="med-qty" type="number" min="0" step="1" required {...field("quantityInStock")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="med-reorder">Reorder level</Label>
                <Input id="med-reorder" type="number" min="0" step="1" required {...field("reorderLevel")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="med-price">Unit price</Label>
                <Input id="med-price" type="number" min="0" step="0.01" required {...field("unitPrice")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : existing ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
