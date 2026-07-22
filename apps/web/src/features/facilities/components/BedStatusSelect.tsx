"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setBedStatus } from "../services/facilities";

const STATUSES = ["available", "occupied", "reserved", "cleaning", "maintenance"] as const;
type BedStatusValue = (typeof STATUSES)[number];

/**
 * A bed has five states (not the usual active/disabled binary), so this
 * uses a select instead of the shared StatusToggle. Admin manages all five
 * here in Module 4; Module 12 (Admissions) is what actually drives
 * available <-> occupied during real patient flow.
 */
export function BedStatusSelect({
  hospitalId,
  bedId,
  status,
}: {
  hospitalId: string;
  bedId: string;
  status: BedStatusValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      try {
        await setBedStatus({ hospitalId, bedId, status: value as BedStatusValue });
        toast.success(`Bed marked ${value}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update bed status.");
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
