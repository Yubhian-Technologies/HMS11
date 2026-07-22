"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { assignBedToAdmission } from "../services/admissions";

export function AssignBedDialog({
  hospitalId,
  branchId,
  admissionId,
  beds,
}: {
  hospitalId: string;
  branchId: string;
  admissionId: string;
  beds: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bedId, setBedId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignBedToAdmission({ hospitalId, branchId, admissionId, bedId });
      toast.success("Bed assigned — patient admitted.");
      setBedId("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign bed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={beds.length === 0} />}>
        {beds.length === 0 ? "No beds available" : "Assign Bed"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign a Bed</DialogTitle>
            <DialogDescription>Only currently available beds are listed.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bedId} onValueChange={(v) => setBedId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an available bed" />
              </SelectTrigger>
              <SelectContent>
                {beds.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !bedId}>
              {submitting ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
