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
import { createAvailabilityRequest } from "../services/availabilityRequests";

export function CreateAvailabilityRequestDialog({
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
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [morningRequested, setMorningRequested] = useState("");
  const [afternoonRequested, setAfternoonRequested] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doctorsInDepartment = departmentId ? doctors.filter((d) => d.departmentId === departmentId) : [];

  function selectDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    setDoctorId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAvailabilityRequest({
        hospitalId,
        branchId,
        doctorId,
        date,
        morningRequested: Number(morningRequested),
        afternoonRequested: Number(afternoonRequested),
      });
      toast.success("Availability request sent.");
      setDepartmentId("");
      setDoctorId("");
      setDate("");
      setMorningRequested("");
      setAfternoonRequested("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Request Availability</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Doctor Availability</DialogTitle>
            <DialogDescription>Ask a doctor to confirm slot capacity for a date.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="avail-department">Department</Label>
              <Select
                items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                value={departmentId}
                onValueChange={(v) => selectDepartment(v ?? "")}
              >
                <SelectTrigger id="avail-department" className="w-full">
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
              <Label htmlFor="avail-doctor">Doctor</Label>
              <Select
                items={Object.fromEntries(doctorsInDepartment.map((d) => [d.id, d.name]))}
                value={doctorId}
                onValueChange={(v) => setDoctorId(v ?? "")}
                disabled={!departmentId}
              >
                <SelectTrigger id="avail-doctor" className="w-full">
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
              <Label htmlFor="avail-date">Date</Label>
              <Input id="avail-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="avail-morning">Morning slots requested</Label>
                <Input
                  id="avail-morning"
                  type="number"
                  min="0"
                  required
                  value={morningRequested}
                  onChange={(e) => setMorningRequested(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="avail-afternoon">Afternoon slots requested</Label>
                <Input
                  id="avail-afternoon"
                  type="number"
                  min="0"
                  required
                  value={afternoonRequested}
                  onChange={(e) => setAfternoonRequested(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !doctorId || !date}>
              {submitting ? "Sending…" : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
