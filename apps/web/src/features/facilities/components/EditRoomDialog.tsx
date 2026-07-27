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
import { updateRoom } from "../services/facilities";

export function EditRoomDialog({
  hospitalId,
  roomId,
  roomNumber,
  dailyRate,
}: {
  hospitalId: string;
  roomId: string;
  roomNumber: string;
  dailyRate: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ roomNumber, dailyRate: String(dailyRate ?? 0) });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateRoom({
        hospitalId,
        roomId,
        roomNumber: form.roomNumber,
        dailyRate: Number(form.dailyRate),
      });
      toast.success(`Room ${form.roomNumber} updated.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update room.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>FR-3.5 / FR-15.1 — daily rate is used to bill room charges.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-room-number">Room number</Label>
              <Input
                id="edit-room-number"
                required
                value={form.roomNumber}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-room-daily-rate">Daily rate</Label>
              <Input
                id="edit-room-daily-rate"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.dailyRate}
                onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
