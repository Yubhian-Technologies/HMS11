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
import { createHospital } from "../services/hospitals";

const EMPTY_FORM = {
  name: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export function CreateHospitalDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

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
      await createHospital({
        name: form.name,
        registrationNumber: form.registrationNumber || undefined,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        address: {
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
      });
      toast.success(`${form.name} created with a default Main Branch.`);
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create hospital.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Hospital</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Hospital</DialogTitle>
            <DialogDescription>
              A default &quot;Main Branch&quot; is created automatically (FR-2.2).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Hospital name</Label>
              <Input id="name" required {...field("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" type="email" required {...field("contactEmail")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input id="contactPhone" required {...field("contactPhone")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="registrationNumber">Registration number (optional)</Label>
              <Input id="registrationNumber" {...field("registrationNumber")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="line1">Address line 1</Label>
              <Input id="line1" required {...field("line1")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="line2">Address line 2 (optional)</Label>
              <Input id="line2" {...field("line2")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" required {...field("city")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" required {...field("state")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input id="postalCode" required {...field("postalCode")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" required {...field("country")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Hospital"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
