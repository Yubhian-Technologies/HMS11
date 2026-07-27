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
import { updateBranch } from "../services/hospitals";
import type { Address } from "@hms/shared";

export function EditBranchDialog({
  hospitalId,
  branchId,
  name,
  contactPhone,
  address,
}: {
  hospitalId: string;
  branchId: string;
  name: string;
  contactPhone: string;
  address: Address;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name,
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
      await updateBranch({
        hospitalId,
        branchId,
        name: form.name,
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
      toast.success(`Branch "${form.name}" updated.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update branch.");
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
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>FR-2.3.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-branch-name">Branch name</Label>
              <Input id="edit-branch-name" required {...field("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-branch-phone">Contact phone</Label>
              <Input id="edit-branch-phone" required {...field("contactPhone")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-branch-line1">Address line 1</Label>
              <Input id="edit-branch-line1" required {...field("line1")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-branch-line2">Address line 2 (optional)</Label>
              <Input id="edit-branch-line2" {...field("line2")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-branch-city">City</Label>
                <Input id="edit-branch-city" required {...field("city")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-branch-state">State</Label>
                <Input id="edit-branch-state" required {...field("state")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-branch-postal">Postal code</Label>
                <Input id="edit-branch-postal" required {...field("postalCode")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-branch-country">Country</Label>
                <Input id="edit-branch-country" required {...field("country")} />
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
