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
import { createBranch } from "../services/hospitals";

const EMPTY_FORM = {
  name: "",
  contactPhone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export function CreateBranchDialog({ hospitalId }: { hospitalId: string }) {
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
      await createBranch({
        hospitalId,
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
      toast.success(`Branch "${form.name}" created.`);
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New Branch</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Branch</DialogTitle>
            <DialogDescription>FR-2.3 — additional locations for this hospital.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input id="branch-name" required {...field("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branch-phone">Contact phone</Label>
              <Input id="branch-phone" required {...field("contactPhone")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branch-line1">Address line 1</Label>
              <Input id="branch-line1" required {...field("line1")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branch-line2">Address line 2 (optional)</Label>
              <Input id="branch-line2" {...field("line2")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="branch-city">City</Label>
                <Input id="branch-city" required {...field("city")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="branch-state">State</Label>
                <Input id="branch-state" required {...field("state")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="branch-postalCode">Postal code</Label>
                <Input id="branch-postalCode" required {...field("postalCode")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="branch-country">Country</Label>
                <Input id="branch-country" required {...field("country")} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
