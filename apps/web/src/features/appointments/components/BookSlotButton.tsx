"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookAppointment } from "../services/appointments";

export function BookSlotButton({
  hospitalId,
  branchId,
  slotId,
  patientId,
  departmentId,
  label,
  redirectTo,
}: {
  hospitalId: string;
  branchId: string;
  slotId: string;
  patientId: string;
  departmentId: string;
  label: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await bookAppointment({ hospitalId, branchId, slotId, patientId, departmentId });
        toast.success("Appointment booked — pending Office approval.");
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to book this slot.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Booking…" : label}
    </Button>
  );
}
