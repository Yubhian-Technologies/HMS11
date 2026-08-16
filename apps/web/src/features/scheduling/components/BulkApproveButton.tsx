"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkApproveSlots } from "../services/scheduling";

export function BulkApproveButton({
  hospitalId,
  doctorId,
  date,
}: {
  hospitalId: string;
  doctorId: string;
  date: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { confirmedCount } = await bulkApproveSlots({ hospitalId, doctorId, date });
        toast.success(confirmedCount > 0 ? `Confirmed ${confirmedCount} slots.` : "Nothing to confirm.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to confirm all.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? "Confirming…" : "Confirm all proposals"}
    </Button>
  );
}
