"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinWaitingList } from "../services/appointments";

export function JoinWaitingListButton({
  hospitalId,
  branchId,
  patientId,
  doctorId,
  departmentId,
  date,
}: {
  hospitalId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { waitingListPosition } = await joinWaitingList({
          hospitalId,
          branchId,
          patientId,
          doctorId,
          departmentId,
          date,
        });
        toast.success(`Added to the waiting list — position ${waitingListPosition}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to join the waiting list.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? "Joining…" : "Join Waiting List"}
    </Button>
  );
}
