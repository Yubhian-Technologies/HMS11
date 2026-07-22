"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInvoice } from "../services/billing";

export function GenerateInvoiceButton({
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
        const { totalAmount } = await generateInvoice({ hospitalId, branchId, appointmentId });
        toast.success(`Invoice generated — total ${totalAmount}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate invoice.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Generating…" : "Generate Invoice"}
    </Button>
  );
}
