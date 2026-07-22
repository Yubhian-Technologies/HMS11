"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setHolidayStatus } from "../services/holidays";

export function HolidayStatusToggle({
  hospitalId,
  holidayId,
  status,
}: {
  hospitalId: string;
  holidayId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setHolidayStatus({ hospitalId, holidayId, status: nextStatus });
      toast.success(nextStatus === "active" ? "Holiday restored." : "Holiday removed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update holiday.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="This date will no longer be excluded from slot generation."
      enableDescription="This date will be excluded from slot generation again."
    />
  );
}
