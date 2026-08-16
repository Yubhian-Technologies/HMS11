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
import { assignNurseToAdmission } from "../services/admissions";

export function AssignNurseDialog({
  hospitalId,
  branchId,
  admissionId,
  currentNurseName,
  nurses,
}: {
  hospitalId: string;
  branchId: string;
  admissionId: string;
  currentNurseName: string | null;
  nurses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nurseId, setNurseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignNurseToAdmission({ hospitalId, branchId, admissionId, nurseId });
      toast.success("Nurse assigned.");
      setNurseId("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign nurse.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={currentNurseName ? "outline" : "default"} disabled={nurses.length === 0} />}>
        {currentNurseName ? `Nurse: ${currentNurseName}` : nurses.length === 0 ? "No nurses available" : "Assign Nurse"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Ward-Care Nurse</DialogTitle>
            <DialogDescription>Only branch nurses are listed.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              items={Object.fromEntries(nurses.map((n) => [n.id, n.name]))}
              value={nurseId}
              onValueChange={(v) => setNurseId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a nurse" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !nurseId}>
              {submitting ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
