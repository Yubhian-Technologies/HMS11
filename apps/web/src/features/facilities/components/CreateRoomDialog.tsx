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
import { createRoom } from "../services/facilities";

export function CreateRoomDialog({
  hospitalId,
  branchId,
  wardId,
}: {
  hospitalId: string;
  branchId: string;
  wardId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createRoom({ hospitalId, branchId, wardId, roomNumber });
      toast.success(`Room ${roomNumber} created.`);
      setRoomNumber("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New Room</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>FR-3.5.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor="room-number">Room number</Label>
            <Input
              id="room-number"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
