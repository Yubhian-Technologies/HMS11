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
import { createManualSlot } from "../services/scheduling";

export function CreateManualSlotDialog({
  hospitalId,
  branchId,
  doctors,
}: {
  hospitalId: string;
  branchId: string;
  doctors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ doctorId: "", date: "", startTime: "", endTime: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createManualSlot({ hospitalId, branchId, ...form });
      toast.success("One-off slot added.");
      setForm({ doctorId: "", date: "", startTime: "", endTime: "" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add slot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New One-off Slot</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add One-off Slot</DialogTitle>
            <DialogDescription>FR-4.5 — goes straight to Approved, outside the doctor&apos;s template.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="manual-doctor">Doctor</Label>
              <Select
                value={form.doctorId}
                onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v ?? "" }))}
              >
                <SelectTrigger id="manual-doctor" className="w-full">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="manual-start">Start time</Label>
                <Input
                  id="manual-start"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manual-end">End time</Label>
                <Input
                  id="manual-end"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.doctorId}>
              {submitting ? "Adding…" : "Add Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
