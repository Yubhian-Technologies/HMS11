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
        const { approvedCount } = await bulkApproveSlots({ hospitalId, doctorId, date });
        toast.success(approvedCount > 0 ? `Approved ${approvedCount} slots.` : "Nothing pending.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to bulk-approve.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? "Approving…" : "Bulk-approve this day"}
    </Button>
  );
}
