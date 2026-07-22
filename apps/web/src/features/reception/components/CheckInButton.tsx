"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkInPatient } from "../services/reception";

export function CheckInButton({
  hospitalId,
  branchId,
  appointmentId,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { token } = await checkInPatient({ hospitalId, branchId, appointmentId });
        toast.success(`Checked in — token ${token}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to check in.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Checking in…" : "Check In"}
    </Button>
  );
}
