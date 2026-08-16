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

const SESSION_LABEL = { morning: "Morning", afternoon: "Afternoon" };

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
  const [form, setForm] = useState({
    doctorId: "",
    date: "",
    session: "" as "" | "morning" | "afternoon",
    count: "1",
  });
  const [submitting, setSubmitting] = useState(false);

  const doctorsInDepartment = departmentId ? doctors.filter((d) => d.departmentId === departmentId) : [];

  function selectDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    setForm((f) => ({ ...f, doctorId: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.session) return;
    setSubmitting(true);
    try {
      await createManualSlot({
        hospitalId,
        branchId,
        doctorId: form.doctorId,
        date: form.date,
        session: form.session,
        count: Number(form.count),
      });
      toast.success("Slots added.");
      setDepartmentId("");
      setForm({ doctorId: "", date: "", session: "", count: "1" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add slots.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New Slot Proposal</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Propose Slot Capacity</DialogTitle>
            <DialogDescription>
              Creates a slot proposal for the doctor to confirm. It becomes bookable only after the doctor
              sends the confirmed total back and you split it into online/walk-in and release it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="manual-department">Department</Label>
              <Select
                items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                value={departmentId}
                onValueChange={(v) => selectDepartment(v ?? "")}
              >
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
                items={Object.fromEntries(doctorsInDepartment.map((d) => [d.id, d.name]))}
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
            <div className="grid gap-1.5">
              <Label htmlFor="manual-session">Session</Label>
              <Select
                items={SESSION_LABEL}
                value={form.session}
                onValueChange={(v) => setForm((f) => ({ ...f, session: (v as "morning" | "afternoon") ?? "" }))}
              >
                <SelectTrigger id="manual-session" className="w-full">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="manual-count">Slot count</Label>
              <Input
                id="manual-count"
                type="number"
                min="1"
                required
                value={form.count}
                onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.doctorId || !form.session}>
              {submitting ? "Adding…" : "Add Slots"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
