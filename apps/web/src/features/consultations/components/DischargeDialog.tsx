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
import { dischargePatient } from "../services/admissions";

export function DischargeDialog({
  hospitalId,
  branchId,
  admissionId,
  patientName,
}: {
  hospitalId: string;
  branchId: string;
  admissionId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentGiven, setTreatmentGiven] = useState("");
  const [conditionAtDischarge, setConditionAtDischarge] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dischargePatient({
        hospitalId,
        branchId,
        admissionId,
        diagnosis,
        treatmentGiven,
        conditionAtDischarge,
        followUpInstructions,
      });
      toast.success(`${patientName} discharged.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to discharge.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Discharge</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Discharge Summary — {patientName}</DialogTitle>
            <DialogDescription>
              FR-12.3 — required before this bed returns to Available.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="d-diagnosis">Diagnosis</Label>
              <Input id="d-diagnosis" required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-treatment">Treatment given</Label>
              <Input
                id="d-treatment"
                required
                value={treatmentGiven}
                onChange={(e) => setTreatmentGiven(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-condition">Condition at discharge</Label>
              <Input
                id="d-condition"
                required
                value={conditionAtDischarge}
                onChange={(e) => setConditionAtDischarge(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-followup">Follow-up instructions</Label>
              <Input
                id="d-followup"
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Discharging…" : "Discharge Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
