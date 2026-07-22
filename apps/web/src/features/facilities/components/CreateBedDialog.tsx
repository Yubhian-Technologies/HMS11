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
import { createBed } from "../services/facilities";

export function CreateBedDialog({
  hospitalId,
  branchId,
  roomId,
}: {
  hospitalId: string;
  branchId: string;
  roomId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bedNumber, setBedNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBed({ hospitalId, branchId, roomId, bedNumber });
      toast.success(`Bed ${bedNumber} created.`);
      setBedNumber("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New Bed</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Bed</DialogTitle>
            <DialogDescription>FR-3.5 — new beds start Available.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor="bed-number">Bed number</Label>
            <Input id="bed-number" required value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Bed"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
