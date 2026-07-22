"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAppointmentStatus } from "../services/appointments";

export function AppointmentActionButtons({
  hospitalId,
  appointmentId,
  status,
}: {
  hospitalId: string;
  appointmentId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(next: "approved" | "rejected" | "cancelled") {
    startTransition(async () => {
      try {
        await setAppointmentStatus({ hospitalId, appointmentId, status: next });
        toast.success(`Appointment ${next}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update appointment.");
      }
    });
  }

  return (
    <div className="flex gap-1">
      {status === "pending" ? (
        <>
          <Button size="sm" disabled={isPending} onClick={() => act("approved")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("rejected")}>
            Reject
          </Button>
        </>
      ) : null}
      {status === "approved" ? (
        <Button size="sm" variant="destructive" disabled={isPending} onClick={() => act("cancelled")}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
