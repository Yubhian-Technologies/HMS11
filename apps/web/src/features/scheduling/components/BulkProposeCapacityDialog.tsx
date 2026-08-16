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
import { bulkCreateManualSlots } from "../services/scheduling";

/**
 * Phase A step 1 in one action: pick a doctor, set a morning + afternoon
 * count, and it's proposed across all 3 days of the current rolling window
 * (up to 6 session-unit proposals) — instead of six separate "New Slot
 * Proposal" clicks via CreateManualSlotDialog.
 */
export function BulkProposeCapacityDialog({
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
  const [morningCount, setMorningCount] = useState("10");
  const [afternoonCount, setAfternoonCount] = useState("10");
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
      const { slotIds } = await bulkCreateManualSlots({
        hospitalId,
        branchId,
        doctorId,
        morningCount: Number(morningCount),
        afternoonCount: Number(afternoonCount),
      });
      toast.success(`Proposed capacity for ${slotIds.length} session${slotIds.length === 1 ? "" : "s"} across the 3-day window.`);
      setDepartmentId("");
      setDoctorId("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to propose capacity.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Propose Full 3-Day Window</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Propose Capacity — Full Rolling Window</DialogTitle>
            <DialogDescription>
              Applies these morning/afternoon counts to all 3 days of the current window for one doctor in a
              single action. Each day still becomes bookable only after the doctor confirms and you split &amp;
              release it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="bulk-department">Department</Label>
              <Select
                items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                value={departmentId}
                onValueChange={(v) => selectDepartment(v ?? "")}
              >
                <SelectTrigger id="bulk-department" className="w-full">
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
              <Label htmlFor="bulk-doctor">Doctor</Label>
              <Select
                items={Object.fromEntries(doctorsInDepartment.map((d) => [d.id, d.name]))}
                value={doctorId}
                onValueChange={(v) => setDoctorId(v ?? "")}
                disabled={!departmentId}
              >
                <SelectTrigger id="bulk-doctor" className="w-full">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="bulk-morning">Morning (per day)</Label>
                <Input
                  id="bulk-morning"
                  type="number"
                  min="0"
                  required
                  value={morningCount}
                  onChange={(e) => setMorningCount(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bulk-afternoon">Afternoon (per day)</Label>
                <Input
                  id="bulk-afternoon"
                  type="number"
                  min="0"
                  required
                  value={afternoonCount}
                  onChange={(e) => setAfternoonCount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !doctorId}>
              {submitting ? "Proposing…" : "Propose Across 3 Days"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
