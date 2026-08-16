"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PatientIntakeFormState } from "../types";

/**
 * FR-5.1's full intake field set, shared by patient self-signup, Reception
 * walk-in creation, and profile editing — the only differences between
 * those three are what wraps this (password field, submit action) and
 * whether it's pre-filled.
 */
export function PatientIntakeFields({
  form,
  setForm,
}: {
  form: PatientIntakeFormState;
  setForm: (updater: (f: PatientIntakeFormState) => PatientIntakeFormState) => void;
}) {
  function field(key: keyof PatientIntakeFormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="pi-name">Full name</Label>
        <Input id="pi-name" required {...field("name")} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-age">Age</Label>
          <Input id="pi-age" type="number" min="0" required {...field("age")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-gender">Gender</Label>
          <Select
            value={form.gender}
            onValueChange={(v) => v && setForm((f) => ({ ...f, gender: v as PatientIntakeFormState["gender"] }))}
          >
            <SelectTrigger id="pi-gender" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-dob">Date of birth</Label>
          <Input id="pi-dob" type="date" required {...field("dob")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-phone">Phone</Label>
          <Input id="pi-phone" required {...field("phone")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-blood">Blood group</Label>
          <Input id="pi-blood" required placeholder="O+" {...field("bloodGroup")} />
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">Address</p>
      <div className="grid gap-1.5">
        <Label htmlFor="pi-line1">Address line 1</Label>
        <Input id="pi-line1" required {...field("line1")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pi-line2">Address line 2 (optional)</Label>
        <Input id="pi-line2" {...field("line2")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-city">City</Label>
          <Input id="pi-city" required {...field("city")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-state">State</Label>
          <Input id="pi-state" required {...field("state")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-postal">Postal code</Label>
          <Input id="pi-postal" required {...field("postalCode")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-country">Country</Label>
          <Input id="pi-country" required {...field("country")} />
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">Emergency contact</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-ec-name">Name</Label>
          <Input id="pi-ec-name" required {...field("emergencyContactName")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-ec-relation">Relation</Label>
          <Input id="pi-ec-relation" required {...field("emergencyContactRelation")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-ec-phone">Phone</Label>
          <Input id="pi-ec-phone" required {...field("emergencyContactPhone")} />
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">Medical background</p>
      <div className="grid gap-1.5">
        <Label htmlFor="pi-history">Medical history</Label>
        <Input id="pi-history" {...field("medicalHistory")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pi-meds">Current medications</Label>
        <Input id="pi-meds" {...field("currentMedications")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pi-allergies">Allergies</Label>
        <Input id="pi-allergies" {...field("allergies")} />
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">Insurance (optional)</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pi-ins-provider">Provider</Label>
          <Input id="pi-ins-provider" {...field("insuranceProvider")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pi-ins-policy">Policy number</Label>
          <Input id="pi-ins-policy" {...field("insurancePolicyNumber")} />
        </div>
      </div>
    </div>
  );
}
