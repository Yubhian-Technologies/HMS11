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
import { respondAvailabilityRequest } from "../services/availabilityRequests";

export function RespondAvailabilityDialog({
  hospitalId,
  requestId,
  morningRequested,
  afternoonRequested,
}: {
  hospitalId: string;
  requestId: string;
  morningRequested: number;
  afternoonRequested: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [morningAvailable, setMorningAvailable] = useState(String(morningRequested));
  const [afternoonAvailable, setAfternoonAvailable] = useState(String(afternoonRequested));
  const [isAvailable, setIsAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await respondAvailabilityRequest({
        hospitalId,
        requestId,
        morningAvailable: Number(morningAvailable),
        afternoonAvailable: Number(afternoonAvailable),
        isAvailable,
      });
      toast.success("Availability response sent.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to respond.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Respond</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm Availability</DialogTitle>
            <DialogDescription>
              Office requested {morningRequested} morning / {afternoonRequested} afternoon slots. Confirm
              what you can actually cover.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="morning-available">Morning slots available</Label>
                <Input
                  id="morning-available"
                  type="number"
                  min="0"
                  required
                  value={morningAvailable}
                  onChange={(e) => setMorningAvailable(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="afternoon-available">Afternoon slots available</Label>
                <Input
                  id="afternoon-available"
                  type="number"
                  min="0"
                  required
                  value={afternoonAvailable}
                  onChange={(e) => setAfternoonAvailable(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="size-4"
              />
              I am available on this date
            </label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send Response"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
