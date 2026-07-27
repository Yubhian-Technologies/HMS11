"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AVAILABILITY_WINDOWS, WEEKDAYS, type Weekday } from "@hms/shared";
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
import { createAvailabilityTemplate } from "../services/scheduling";

const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function CreateTemplateDialog({
  hospitalId,
  branchId,
  doctorId,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weekday, setWeekday] = useState<Weekday>("monday");
  const [morningSlots, setMorningSlots] = useState("8");
  const [afternoonSlots, setAfternoonSlots] = useState("8");
  const [morningWalkInReserved, setMorningWalkInReserved] = useState("0");
  const [afternoonWalkInReserved, setAfternoonWalkInReserved] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAvailabilityTemplate({
        hospitalId,
        branchId,
        doctorId,
        weekday,
        morningSlots: Number(morningSlots),
        afternoonSlots: Number(afternoonSlots),
        morningWalkInReserved: Number(morningWalkInReserved),
        afternoonWalkInReserved: Number(afternoonWalkInReserved),
      });
      toast.success(`Template added for ${WEEKDAY_LABEL[weekday]}.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New Weekly Slot Template</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Weekly Availability Template</DialogTitle>
            <DialogDescription>
              FR-4.1 — slots for this day generate automatically each night for the rolling 3-day
              window (FR-4.2).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="tpl-weekday">Day of week</Label>
              <Select items={WEEKDAY_LABEL} value={weekday} onValueChange={(v) => v && setWeekday(v as Weekday)}>
                <SelectTrigger id="tpl-weekday" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {WEEKDAY_LABEL[day]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-morning">
                  Morning slots
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({AVAILABILITY_WINDOWS.morning.start}–{AVAILABILITY_WINDOWS.morning.end})
                  </span>
                </Label>
                <Input
                  id="tpl-morning"
                  type="number"
                  min="0"
                  required
                  value={morningSlots}
                  onChange={(e) => setMorningSlots(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-afternoon">
                  Afternoon slots
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({AVAILABILITY_WINDOWS.afternoon.start}–{AVAILABILITY_WINDOWS.afternoon.end})
                  </span>
                </Label>
                <Input
                  id="tpl-afternoon"
                  type="number"
                  min="0"
                  required
                  value={afternoonSlots}
                  onChange={(e) => setAfternoonSlots(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-morning-walkin">Reserve for walk-ins (morning)</Label>
                <Input
                  id="tpl-morning-walkin"
                  type="number"
                  min="0"
                  value={morningWalkInReserved}
                  onChange={(e) => setMorningWalkInReserved(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-afternoon-walkin">Reserve for walk-ins (afternoon)</Label>
                <Input
                  id="tpl-afternoon-walkin"
                  type="number"
                  min="0"
                  value={afternoonWalkInReserved}
                  onChange={(e) => setAfternoonWalkInReserved(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
