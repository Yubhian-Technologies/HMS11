"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveFeedback } from "../services/feedback";

export function ResolveFeedbackButtons({
  hospitalId,
  branchId,
  feedbackId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  feedbackId: string;
  status: "open" | "acknowledged" | "resolved";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(next: "acknowledged" | "resolved") {
    startTransition(async () => {
      try {
        await resolveFeedback({ hospitalId, branchId, feedbackId, status: next });
        toast.success(`Marked ${next}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  if (status === "resolved") return null;

  return (
    <div className="flex gap-1">
      {status === "open" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("acknowledged")}>
          Acknowledge
        </Button>
      )}
      <Button size="sm" disabled={isPending} onClick={() => act("resolved")}>
        Resolve
      </Button>
    </div>
  );
}
