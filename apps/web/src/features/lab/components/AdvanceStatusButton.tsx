"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceLabOrderStatus } from "../services/lab";

const NEXT_STATUS: Record<string, "sampleCollected" | "processing" | "completed" | "verified"> = {
  pending: "sampleCollected",
  sampleCollected: "processing",
  processing: "completed",
  completed: "verified",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Mark Sample Collected",
  sampleCollected: "Mark Processing",
  processing: "Mark Completed",
  completed: "Mark Verified",
};

export function AdvanceStatusButton({
  hospitalId,
  labOrderId,
  status,
}: {
  hospitalId: string;
  labOrderId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STATUS[status];
  if (!next) return null;

  function handleClick() {
    startTransition(async () => {
      try {
        await advanceLabOrderStatus({ hospitalId, labOrderId, toStatus: next! });
        toast.success(`Marked ${next}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      }
    });
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Updating…" : NEXT_LABEL[status]}
    </Button>
  );
}
