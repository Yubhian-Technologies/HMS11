"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAppointmentStatus } from "../services/appointments";

export function AppointmentActionButtons({
  hospitalId,
  branchId,
  appointmentId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(next: "BOOKED" | "REJECTED" | "CANCELLED") {
    startTransition(async () => {
      try {
        await setAppointmentStatus({ hospitalId, branchId, appointmentId, status: next });
        toast.success(`Appointment ${next.toLowerCase()}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update appointment.");
      }
    });
  }

  return (
    <div className="flex gap-1">
      {status === "PENDING" ? (
        <>
          <Button size="sm" disabled={isPending} onClick={() => act("BOOKED")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("REJECTED")}>
            Reject
          </Button>
        </>
      ) : null}
      {status === "BOOKED" ? (
        <Button size="sm" variant="destructive" disabled={isPending} onClick={() => act("CANCELLED")}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
