"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createManualSlot } from "../services/scheduling";

export function CreateManualSlotDialog({
  hospitalId,
  branchId,
  departments,
  doctors,
}: {
  hospitalId: string;
  branchId: string;
  departments: { id: string; name: string }[];
  doctors: { id: string; name: string; departmentId: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [form, setForm] = useState({ doctorId: "", date: "", startTime: "", endTime: "" });
  const [submitting, setSubmitting] = useState(false);

  const doctorsInDepartment = departmentId ? doctors.filter((d) => d.departmentId === departmentId) : [];

  function selectDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    setForm((f) => ({ ...f, doctorId: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createManualSlot({ hospitalId, branchId, ...form });
      toast.success("One-off slot added.");
      setDepartmentId("");
      setForm({ doctorId: "", date: "", startTime: "", endTime: "" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add slot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New One-off Slot</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add One-off Slot</DialogTitle>
            <DialogDescription>FR-4.5 — goes straight to Approved, outside the doctor&apos;s template.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="manual-department">Department</Label>
              <Select value={departmentId} onValueChange={(v) => selectDepartment(v ?? "")}>
                <SelectTrigger id="manual-department" className="w-full">
                  <SelectValue placeholder="Select a department" />
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
            <div className="grid gap-1.5">
              <Label htmlFor="manual-doctor">Doctor</Label>
              <Select
                value={form.doctorId}
                onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v ?? "" }))}
                disabled={!departmentId}
              >
                <SelectTrigger id="manual-doctor" className="w-full">
                  <SelectValue placeholder={departmentId ? "Select a doctor" : "Select a department first"} />
                </SelectTrigger>
                <SelectContent>
                  {doctorsInDepartment.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="manual-start">Start time</Label>
                <Input
                  id="manual-start"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="manual-end">End time</Label>
                <Input
                  id="manual-end"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.doctorId}>
              {submitting ? "Adding…" : "Add Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
