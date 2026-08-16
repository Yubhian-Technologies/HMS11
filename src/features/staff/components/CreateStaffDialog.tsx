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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStaffAccount } from "../services/staff";

const ROLE_LABEL = {
  office: "Office",
  reception: "Reception",
  nurse: "Nurse",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
} as const;

type NonDoctorRole = keyof typeof ROLE_LABEL;

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", branchId: "" };

export function CreateStaffDialog({
  hospitalId,
  role,
  branches,
}: {
  hospitalId: string;
  role: NonDoctorRole;
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function field(key: "name" | "email" | "phone" | "password") {
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
      await createStaffAccount({ hospitalId, role, ...form });
      toast.success(`${form.name} added as ${ROLE_LABEL[role]}.`);
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New {ROLE_LABEL[role]}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New {ROLE_LABEL[role]} Account</DialogTitle>
            <DialogDescription>FR-3.1 — scoped to one branch of your hospital.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="staff-name">Name</Label>
              <Input id="staff-name" required {...field("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" required {...field("email")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input id="staff-phone" required {...field("phone")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-password">Password</Label>
              <Input id="staff-password" type="password" required minLength={8} {...field("password")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-branch">Branch</Label>
              <Select
                items={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
                value={form.branchId}
                onValueChange={(value) => setForm((f) => ({ ...f, branchId: value ?? "" }))}
              >
                <SelectTrigger id="staff-branch" className="w-full">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.branchId}>
              {submitting ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
