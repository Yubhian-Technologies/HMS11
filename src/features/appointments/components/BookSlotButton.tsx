"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookAppointment } from "../services/appointments";

/**
 * `doctorId` (Reception's own booking, staff can pick a doctor by name) and
 * `departmentId` (patient booking — doctor-anonymous, auto-assigned server-
 * side) are mutually exclusive per caller; pass exactly one.
 */
export function BookSlotButton({
  hospitalId,
  branchId,
  doctorId,
  departmentId,
  date,
  session,
  patientId,
  label,
  redirectTo,
}: {
  hospitalId: string;
  branchId: string;
  doctorId?: string;
  departmentId?: string;
  date: string;
  session: "morning" | "afternoon";
  patientId: string;
  label: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await bookAppointment({ hospitalId, branchId, doctorId, departmentId, date, session, patientId });
        toast.success("Appointment booked.");
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
