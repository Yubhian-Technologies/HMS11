"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rescheduleAppointment } from "../services/appointments";

export function RescheduleSlotButton({
  hospitalId,
  appointmentId,
  newSlotId,
  label,
}: {
  hospitalId: string;
  appointmentId: string;
  newSlotId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await rescheduleAppointment({ hospitalId, appointmentId, newSlotId });
        toast.success("Appointment rescheduled.");
        router.push("/office/appointments");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reschedule.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Rescheduling…" : label}
    </Button>
  );
}
