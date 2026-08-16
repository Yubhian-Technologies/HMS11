"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startConsultation } from "../services/appointments";

/**
 * Actually flips VITALS_COMPLETED -> CONSULTING before navigating (not a
 * plain link) — this is what makes "being seen right now" distinguishable
 * from "next in queue" on the doctor's own queue.
 */
export function StartConsultationButton({
  hospitalId,
  branchId,
  appointmentId,
  hasVitals,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
  hasVitals: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await startConsultation({ hospitalId, branchId, appointmentId });
        router.push(`/doctor/consult?appointmentId=${appointmentId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start consultation.");
      }
    });
  }

  return (
    <Button size="sm" disabled={!hasVitals || isPending} onClick={handleClick}>
      {isPending ? "Starting…" : hasVitals ? "Start Consultation" : "Awaiting vitals"}
    </Button>
  );
}
