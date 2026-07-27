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
import { createLabTest, updateLabTest } from "../services/labTests";
import type { LabTestRecord } from "../services/read";

// Only the editable-form fields — a Server Component can't pass a raw
// Firestore Timestamp (createdAt/updatedAt) to a Client Component.
type EditableLabTest = Pick<LabTestRecord, "id" | "name" | "category" | "price" | "sampleType">;

export function LabTestFormDialog({
  hospitalId,
  branchId,
  existing,
}: {
  hospitalId: string;
  branchId: string;
  existing?: EditableLabTest;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    category: existing?.category ?? "",
    price: existing ? String(existing.price) : "",
    sampleType: existing?.sampleType ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

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
      const payload = { ...form, price: Number(form.price) };
      if (existing) {
        await updateLabTest({ hospitalId, branchId, testId: existing.id, ...payload });
        toast.success(`"${form.name}" updated.`);
      } else {
        await createLabTest({ hospitalId, branchId, ...payload });
        toast.success(`"${form.name}" added to the test catalog.`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save lab test.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={existing ? "outline" : "default"} size="sm" />}>
        {existing ? "Edit" : "New Lab Test"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{existing ? "Edit Lab Test" : "Add Lab Test"}</DialogTitle>
            <DialogDescription>FR-3.6.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="test-name">Test name</Label>
              <Input id="test-name" required {...field("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="test-category">Category</Label>
                <Input id="test-category" required {...field("category")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="test-sample">Sample type</Label>
                <Input id="test-sample" required {...field("sampleType")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="test-price">Price</Label>
              <Input id="test-price" type="number" min="0" step="0.01" required {...field("price")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : existing ? "Save Changes" : "Create Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
