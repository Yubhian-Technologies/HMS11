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
import { createDoctorAccount } from "../services/staff";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  branchId: "",
  departmentId: "",
  specialization: "",
  qualifications: "",
  consultationFee: "",
};

export function CreateDoctorDialog({
  hospitalId,
  branches,
  departments,
}: {
  hospitalId: string;
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function field(
    key: "name" | "email" | "phone" | "password" | "specialization" | "qualifications" | "consultationFee",
  ) {
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
      await createDoctorAccount({
        hospitalId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        branchId: form.branchId,
        departmentId: form.departmentId,
        specialization: form.specialization,
        qualifications: form.qualifications
          .split(",")
          .map((q) => q.trim())
          .filter(Boolean),
        consultationFee: Number(form.consultationFee),
      });
      toast.success(`Dr. ${form.name} added.`);
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create doctor account.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.branchId && form.departmentId && form.consultationFee !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New Doctor</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Doctor Account</DialogTitle>
            <DialogDescription>FR-3.1–3.3 — branch, department, and consultation fee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="doc-name">Name</Label>
              <Input id="doc-name" required {...field("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="doc-email">Email</Label>
                <Input id="doc-email" type="email" required {...field("email")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="doc-phone">Phone</Label>
                <Input id="doc-phone" required {...field("phone")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-password">Password</Label>
              <Input id="doc-password" type="password" required minLength={8} {...field("password")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="doc-branch">Branch</Label>
                <Select
                  items={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
                  value={form.branchId}
                  onValueChange={(value) => setForm((f) => ({ ...f, branchId: value ?? "" }))}
                >
                  <SelectTrigger id="doc-branch" className="w-full">
                    <SelectValue placeholder="Branch" />
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
              <div className="grid gap-1.5">
                <Label htmlFor="doc-department">Department</Label>
                <Select
                  items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                  value={form.departmentId}
                  onValueChange={(value) => setForm((f) => ({ ...f, departmentId: value ?? "" }))}
                >
                  <SelectTrigger id="doc-department" className="w-full">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-specialization">Specialization</Label>
              <Input id="doc-specialization" required {...field("specialization")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-qualifications">Qualifications (comma-separated)</Label>
              <Input id="doc-qualifications" placeholder="MBBS, MD" {...field("qualifications")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-fee">Consultation fee</Label>
              <Input id="doc-fee" type="number" min="0" step="0.01" required {...field("consultationFee")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
