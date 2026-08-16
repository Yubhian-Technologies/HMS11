"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookAppointment } from "../services/appointments";

export function BookSlotButton({
  hospitalId,
  branchId,
  doctorId,
  date,
  session,
  patientId,
  departmentId,
  label,
  redirectTo,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  date: string;
  session: "morning" | "afternoon";
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
        const result = await bookAppointment({ hospitalId, branchId, doctorId, date, session, patientId, departmentId });
        toast.success(
          result.status === "BOOKED" ? "Appointment booked." : "Appointment booked — pending Office approval.",
        );
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to book this session.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Booking…" : label}
    </Button>
  );
}
