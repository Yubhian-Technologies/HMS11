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
import { assignHospitalAdmin } from "../services/hospitals";

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

export function AssignAdminDialog({
  hospitalId,
  hasExistingAdmin,
}: {
  hospitalId: string;
  hasExistingAdmin: boolean;
}) {
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
      await assignHospitalAdmin({ hospitalId, ...form });
      toast.success(
        `${form.name} assigned as admin.${hasExistingAdmin ? " The previous admin's access was revoked." : ""}`,
      );
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {hasExistingAdmin ? "Reassign Admin" : "Assign Admin"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{hasExistingAdmin ? "Reassign Hospital Admin" : "Assign Hospital Admin"}</DialogTitle>
            <DialogDescription>
              {hasExistingAdmin
                ? "This creates a new admin account and disables the current one (FR-2.4)."
                : "Creates a new admin account scoped to this hospital (FR-2.4)."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-name">Name</Label>
              <Input id="admin-name" required {...field("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" required {...field("email")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-phone">Phone</Label>
              <Input id="admin-phone" required {...field("phone")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" required minLength={8} {...field("password")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
