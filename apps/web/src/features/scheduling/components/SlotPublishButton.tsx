"use client";

import { useState, useTransition } from "react";
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
import { setSlotStatus } from "../services/scheduling";

/**
 * `proposed` (not yet confirmed by the doctor) → Withdraw only, no split UI.
 * `doctorReviewed` (doctor confirmed the total) → this IS the online/walk-in
 * split + no-show cutoff decision — Office makes it here, once, at release.
 */
export function SlotPublishButton({
  hospitalId,
  branchId,
  doctorId,
  slotId,
  status,
  totalCount,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  slotId: string;
  status: "proposed" | "doctorReviewed";
  totalCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [walkInReserved, setWalkInReserved] = useState("0");
  const [cutoff, setCutoff] = useState("15");

  function withdraw() {
    startTransition(async () => {
      try {
        await setSlotStatus({ hospitalId, branchId, doctorId, slotId, status: "rejected" });
        toast.success("Proposal withdrawn.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
      }
    });
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await setSlotStatus({
          hospitalId,
          branchId,
          doctorId,
          slotId,
          status: "approved",
          walkInReserved: Number(walkInReserved),
          checkInCutoffMinutes: Number(cutoff),
        });
        toast.success("Slot released to the public.");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
      }
    });
  }

  if (status === "proposed") {
    return (
      <Button size="sm" variant="outline" disabled={isPending} onClick={withdraw}>
        Withdraw
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Split & Release</DialogTrigger>
      <DialogContent>
        <form onSubmit={handlePublish}>
          <DialogHeader>
            <DialogTitle>Split & Release</DialogTitle>
            <DialogDescription>
              The doctor confirmed {totalCount} slots. Decide how many are reserved for walk-ins (the
              rest is online-bookable), and the no-show check-in cutoff, then release it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="publish-walkin">Reserve for walk-ins</Label>
              <Input
                id="publish-walkin"
                type="number"
                min="0"
                max={totalCount}
                value={walkInReserved}
                onChange={(e) => setWalkInReserved(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="publish-cutoff">No-show cutoff (minutes)</Label>
              <Input
                id="publish-cutoff"
                type="number"
                min="1"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Releasing…" : "Release"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
