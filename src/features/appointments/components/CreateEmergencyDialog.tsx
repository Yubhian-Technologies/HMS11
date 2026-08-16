"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { createEmergencyAppointment } from "../services/appointments";

export function CreateEmergencyDialog({
  hospitalId,
  branchId,
  patients,
  doctors,
}: {
  hospitalId: string;
  branchId: string;
  patients: { id: string; name: string }[];
  doctors: { id: string; name: string; departmentId: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!doctor) return;
    setSubmitting(true);
    try {
      await createEmergencyAppointment({
        hospitalId,
        branchId,
        patientId,
        doctorId,
        departmentId: doctor.departmentId,
      });
      toast.success("Emergency queued — highest priority.");
      setPatientId("");
      setDoctorId("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create emergency entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Emergency</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Emergency Check-in</DialogTitle>
            <DialogDescription>
              FR-7 — bypasses slots entirely, highest queue priority, no approval needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="er-patient">Patient</Label>
              <Select
                items={Object.fromEntries(patients.map((p) => [p.id, p.name]))}
                value={patientId}
                onValueChange={(v) => setPatientId(v ?? "")}
              >
                <SelectTrigger id="er-patient" className="w-full">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="er-doctor">Doctor</Label>
              <Select
                items={Object.fromEntries(doctors.map((d) => [d.id, d.name]))}
                value={doctorId}
                onValueChange={(v) => setDoctorId(v ?? "")}
              >
                <SelectTrigger id="er-doctor" className="w-full">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={submitting || !patientId || !doctorId}>
              {submitting ? "Creating…" : "Create Emergency"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
