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
import { PatientIntakeFields } from "./PatientIntakeFields";
import { EMPTY_PATIENT_INTAKE, patientIntakePayload } from "../types";
import { createWalkInPatient } from "../services/patients";

export function CreateWalkInPatientDialog({
  hospitalId,
  branchId,
}: {
  hospitalId: string;
  branchId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState(EMPTY_PATIENT_INTAKE);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createWalkInPatient({
        hospitalId,
        branchId,
        email: email || undefined,
        ...patientIntakePayload(form),
      });
      toast.success(`${form.name} registered.`);
      setForm(EMPTY_PATIENT_INTAKE);
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register patient.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Walk-in Patient</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register Walk-in Patient</DialogTitle>
            <DialogDescription>
              FR-5.2 — no login required; the patient can self-register separately later.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            <div className="mb-4 grid gap-1.5">
              <Label htmlFor="walkin-email">Email (optional)</Label>
              <Input id="walkin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <PatientIntakeFields form={form} setForm={setForm} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
