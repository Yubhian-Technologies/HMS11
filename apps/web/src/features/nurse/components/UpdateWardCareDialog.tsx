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
import { updateWardCareStatus } from "../services/nurse";

export function UpdateWardCareDialog({
  hospitalId,
  branchId,
  admissionId,
  patientName,
  currentNotes,
}: {
  hospitalId: string;
  branchId: string;
  admissionId: string;
  patientName: string;
  currentNotes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [careNotes, setCareNotes] = useState(currentNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateWardCareStatus({ hospitalId, branchId, admissionId, careNotes });
      toast.success("Ward-care note updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ward-care note.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Update Note</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ward Care — {patientName}</DialogTitle>
            <DialogDescription>Record the current progress note for this patient.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="care-notes">Care note</Label>
            <Input id="care-notes" required value={careNotes} onChange={(e) => setCareNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !careNotes}>
              {submitting ? "Saving…" : "Save Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
