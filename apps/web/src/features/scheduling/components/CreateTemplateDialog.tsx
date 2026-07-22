"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WEEKDAYS, type Weekday } from "@hms/shared";
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
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("15");
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
        startTime,
        endTime,
        slotDurationMinutes: Number(slotDurationMinutes),
        breaks: [],
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
              <Select value={weekday} onValueChange={(v) => v && setWeekday(v as Weekday)}>
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
                <Label htmlFor="tpl-start">Start time</Label>
                <Input
                  id="tpl-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tpl-end">End time</Label>
                <Input
                  id="tpl-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tpl-duration">Slot duration (minutes)</Label>
              <Input
                id="tpl-duration"
                type="number"
                min="5"
                step="5"
                required
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(e.target.value)}
              />
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
