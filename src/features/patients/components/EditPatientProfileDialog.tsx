"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { PatientIntakeFormState } from "../types";
import { patientIntakePayload } from "../types";
import { updatePatientProfile } from "../services/patients";
import type { PatientRecord } from "../services/read";

// Only the editable-form fields — never the full record. A Server Component
// can't pass a raw Firestore Timestamp (createdAt/updatedAt) to a Client
// Component; React's RSC boundary rejects any non-plain-object value.
export type EditablePatientProfile = Pick<
  PatientRecord,
  | "id"
  | "name"
  | "age"
  | "gender"
  | "dob"
  | "phone"
  | "address"
  | "bloodGroup"
  | "emergencyContact"
  | "medicalHistory"
  | "currentMedications"
  | "allergies"
  | "insurance"
>;

function toFormState(patient: EditablePatientProfile): PatientIntakeFormState {
  return {
    name: patient.name,
    age: String(patient.age),
    gender: patient.gender,
    dob: patient.dob,
    phone: patient.phone,
    line1: patient.address.line1,
    line2: patient.address.line2 ?? "",
    city: patient.address.city,
    state: patient.address.state,
    postalCode: patient.address.postalCode,
    country: patient.address.country,
    bloodGroup: patient.bloodGroup,
    emergencyContactName: patient.emergencyContact.name,
    emergencyContactRelation: patient.emergencyContact.relation,
    emergencyContactPhone: patient.emergencyContact.phone,
    medicalHistory: patient.medicalHistory,
    currentMedications: patient.currentMedications,
    allergies: patient.allergies,
    insuranceProvider: patient.insurance?.provider ?? "",
    insurancePolicyNumber: patient.insurance?.policyNumber ?? "",
  };
}

export function EditPatientProfileDialog({ patient }: { patient: EditablePatientProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientIntakeFormState>(() => toFormState(patient));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updatePatientProfile({ patientId: patient.id, ...patientIntakePayload(form) });
      toast.success("Profile updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit Profile</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Patient Profile</DialogTitle>
            <DialogDescription>FR-5.3.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            <PatientIntakeFields form={form} setForm={setForm} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
