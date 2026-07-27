"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markLabOrderPaid } from "../services/lab";

export function MarkLabOrderPaidButton({
  hospitalId,
  branchId,
  labOrderId,
}: {
  hospitalId: string;
  branchId: string;
  labOrderId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act() {
    startTransition(async () => {
      try {
        await markLabOrderPaid({ hospitalId, branchId, labOrderId });
        toast.success("Marked paid — sent to the Lab dashboard.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark lab order paid.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={act}>
      Mark Paid
    </Button>
  );
}
