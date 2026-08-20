"use client";

import { useMemo, useState } from "react";
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
import { recordVitals } from "../services/nurse";

const EMPTY_FORM = {
  weightKg: "",
  heightCm: "",
  bloodPressure: "",
  pulse: "",
  sugarMgDl: "",
  temperatureC: "",
  spo2: "",
  respiratoryRate: "",
  chiefComplaint: "",
  notes: "",
};

export function RecordVitalsDialog({
  hospitalId,
  branchId,
  appointmentId,
  patientName,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const bmi = useMemo(() => {
    const w = Number(form.weightKg);
    const h = Number(form.heightCm) / 100;
    if (!w || !h) return null;
    return Math.round((w / (h * h)) * 10) / 10;
  }, [form.weightKg, form.heightCm]);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recordVitals({
        hospitalId,
        branchId,
        appointmentId,
        weightKg: Number(form.weightKg),
        heightCm: Number(form.heightCm),
        bloodPressure: form.bloodPressure,
        pulse: Number(form.pulse),
        sugarMgDl: form.sugarMgDl ? Number(form.sugarMgDl) : null,
        temperatureC: Number(form.temperatureC),
        spo2: Number(form.spo2),
        respiratoryRate: form.respiratoryRate ? Number(form.respiratoryRate) : null,
        chiefComplaint: form.chiefComplaint,
        notes: form.notes,
      });
      toast.success("Vitals recorded — sent to the doctor now.");
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record vitals.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Record Vitals</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Vitals — {patientName}</DialogTitle>
            <DialogDescription>
              Vitals will be saved and the patient will be sent to the Doctor&apos;s Queue immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="v-weight">Weight (kg)</Label>
                <Input id="v-weight" type="number" min="0" step="0.1" required {...field("weightKg")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="v-height">Height (cm)</Label>
                <Input id="v-height" type="number" min="0" step="0.1" required {...field("heightCm")} />
              </div>
              <div className="grid gap-1.5">
                <Label>BMI</Label>
                <Input readOnly value={bmi ?? ""} placeholder="auto" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="v-bp">Blood pressure</Label>
                <Input id="v-bp" placeholder="120/80" required {...field("bloodPressure")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="v-pulse">Pulse (bpm)</Label>
                <Input id="v-pulse" type="number" min="0" required {...field("pulse")} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="v-sugar">Sugar (mg/dL)</Label>
                <Input id="v-sugar" type="number" min="0" {...field("sugarMgDl")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="v-temp">Temp (°C)</Label>
                <Input id="v-temp" type="number" min="0" step="0.1" required {...field("temperatureC")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="v-spo2">SpO2 (%)</Label>
                <Input id="v-spo2" type="number" min="0" max="100" required {...field("spo2")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="v-resp">Resp. rate</Label>
                <Input id="v-resp" type="number" min="0" {...field("respiratoryRate")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-complaint">Chief complaint</Label>
              <Input id="v-complaint" {...field("chiefComplaint")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-notes">Notes</Label>
              <Input id="v-notes" {...field("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving & Sending…" : "Save & Send to Doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
