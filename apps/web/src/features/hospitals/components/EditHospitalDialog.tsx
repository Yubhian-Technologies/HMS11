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
import { updateHospital } from "../services/hospitals";
import type { Address } from "@hms/shared";

export function EditHospitalDialog({
  hospitalId,
  name,
  registrationNumber,
  contactEmail,
  contactPhone,
  address,
}: {
  hospitalId: string;
  name: string;
  registrationNumber?: string | null;
  contactEmail: string;
  contactPhone: string;
  address: Address;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name,
    registrationNumber: registrationNumber ?? "",
    contactEmail,
    contactPhone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  });
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
      await updateHospital({
        hospitalId,
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
      toast.success(`${form.name} updated.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update hospital.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Hospital</DialogTitle>
            <DialogDescription>FR-2.1.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-hosp-name">Hospital name</Label>
              <Input id="edit-hosp-name" required {...field("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-email">Contact email</Label>
                <Input id="edit-hosp-email" type="email" required {...field("contactEmail")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-phone">Contact phone</Label>
                <Input id="edit-hosp-phone" required {...field("contactPhone")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-hosp-reg">Registration number (optional)</Label>
              <Input id="edit-hosp-reg" {...field("registrationNumber")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-hosp-line1">Address line 1</Label>
              <Input id="edit-hosp-line1" required {...field("line1")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-hosp-line2">Address line 2 (optional)</Label>
              <Input id="edit-hosp-line2" {...field("line2")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-city">City</Label>
                <Input id="edit-hosp-city" required {...field("city")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-state">State</Label>
                <Input id="edit-hosp-state" required {...field("state")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-postal">Postal code</Label>
                <Input id="edit-hosp-postal" required {...field("postalCode")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-hosp-country">Country</Label>
                <Input id="edit-hosp-country" required {...field("country")} />
              </div>
            </div>
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
