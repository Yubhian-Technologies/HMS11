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
import { updateStaffAccount, updateDoctorProfile } from "../services/staff";

export function EditDoctorDialog({
  hospitalId,
  uid,
  name,
  phone,
  branchId,
  departmentId,
  specialization,
  qualifications,
  consultationFee,
  branches,
  departments,
}: {
  hospitalId: string;
  uid: string;
  name: string;
  phone: string;
  branchId: string;
  departmentId: string;
  specialization: string;
  qualifications: string[];
  consultationFee: number;
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name,
    phone,
    branchId,
    departmentId,
    specialization,
    qualifications: qualifications.join(", "),
    consultationFee: String(consultationFee),
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Promise.all([
        updateStaffAccount({ hospitalId, uid, name: form.name, phone: form.phone, branchId: form.branchId }),
        updateDoctorProfile({
          hospitalId,
          uid,
          departmentId: form.departmentId,
          specialization: form.specialization,
          qualifications: form.qualifications
            .split(",")
            .map((q) => q.trim())
            .filter(Boolean),
          consultationFee: Number(form.consultationFee),
        }),
      ]);
      toast.success(`Dr. ${form.name} updated.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>FR-3.1–3.3.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-doc-name">Name</Label>
              <Input
                id="edit-doc-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-doc-phone">Phone</Label>
              <Input
                id="edit-doc-phone"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-doc-branch">Branch</Label>
                <Select
                  items={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
                  value={form.branchId}
                  onValueChange={(value) => setForm((f) => ({ ...f, branchId: value ?? "" }))}
                >
                  <SelectTrigger id="edit-doc-branch" className="w-full">
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
                <Label htmlFor="edit-doc-department">Department</Label>
                <Select
                  items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                  value={form.departmentId}
                  onValueChange={(value) => setForm((f) => ({ ...f, departmentId: value ?? "" }))}
                >
                  <SelectTrigger id="edit-doc-department" className="w-full">
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
              <Label htmlFor="edit-doc-specialization">Specialization</Label>
              <Input
                id="edit-doc-specialization"
                required
                value={form.specialization}
                onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-doc-qualifications">Qualifications (comma-separated)</Label>
              <Input
                id="edit-doc-qualifications"
                placeholder="MBBS, MD"
                value={form.qualifications}
                onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-doc-fee">Consultation fee</Label>
              <Input
                id="edit-doc-fee"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.consultationFee}
                onChange={(e) => setForm((f) => ({ ...f, consultationFee: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.branchId || !form.departmentId}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
