"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WEEKDAYS, type Weekday } from "@hms/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateBranch } from "../services/hospitals";

interface TimingRow {
  day: Weekday;
  open: boolean;
  start: string;
  end: string;
}

const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function initialRows(existing: { day: Weekday; open: string; close: string }[]): TimingRow[] {
  const byDay = new Map(existing.map((t) => [t.day, t]));
  return WEEKDAYS.map((day) => {
    const existingTiming = byDay.get(day);
    return {
      day,
      open: Boolean(existingTiming),
      start: existingTiming?.open ?? "09:00",
      end: existingTiming?.close ?? "17:00",
    };
  });
}

export function EditTimingsDialog({
  hospitalId,
  branchId,
  timings,
}: {
  hospitalId: string;
  branchId: string;
  timings: { day: Weekday; open: string; close: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TimingRow[]>(() => initialRows(timings));
  const [submitting, setSubmitting] = useState(false);

  function updateRow(day: Weekday, patch: Partial<TimingRow>) {
    setRows((prev) => prev.map((row) => (row.day === day ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateBranch({
        hospitalId,
        branchId,
        timings: rows
          .filter((row) => row.open)
          .map((row) => ({ day: row.day, open: row.start, close: row.end })),
      });
      toast.success("Hospital timings updated.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update timings.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit Timings</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Hospital Timings</DialogTitle>
            <DialogDescription>FR-3.4 — working hours per day for this branch.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {rows.map((row) => (
              <div key={row.day} className="flex items-center gap-3">
                <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) => updateRow(row.day, { open: e.target.checked })}
                    className="size-4"
                  />
                  {WEEKDAY_LABEL[row.day]}
                </label>
                <Input
                  type="time"
                  disabled={!row.open}
                  value={row.start}
                  onChange={(e) => updateRow(row.day, { start: e.target.value })}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  disabled={!row.open}
                  value={row.end}
                  onChange={(e) => updateRow(row.day, { end: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Timings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
