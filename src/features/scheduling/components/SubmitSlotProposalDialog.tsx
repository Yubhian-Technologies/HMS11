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
import { submitSlotProposal, setSlotStatus } from "../services/scheduling";

const SESSION_LABEL = { morning: "Morning", afternoon: "Afternoon" };

export function SubmitSlotProposalDialog({
  hospitalId,
  branchId,
  doctorId,
  slotId,
  date,
  session,
  totalCount,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  slotId: string;
  date: string;
  session: "morning" | "afternoon";
  totalCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(String(totalCount));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitSlotProposal({
        hospitalId,
        branchId,
        doctorId,
        slotId,
        totalCount: Number(count),
      });
      toast.success("Confirmed — sent back to Office to split and release.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    try {
      await setSlotStatus({ hospitalId, branchId, doctorId, slotId, status: "rejected" });
      toast.success("Proposal declined.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Review</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm Slot Capacity</DialogTitle>
            <DialogDescription>
              Office proposed {totalCount} {SESSION_LABEL[session]} slots on {date}. Adjust the total if
              needed, then confirm — Office will split it into online/walk-in and release it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor="proposal-count">Slot count</Label>
            <Input
              id="proposal-count"
              type="number"
              min="1"
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={handleReject}>
              Decline
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Confirming…" : "Confirm & Send to Office"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
