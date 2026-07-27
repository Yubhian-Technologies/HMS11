"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSlotStatus } from "../services/scheduling";

export function SlotApproveRejectButtons({
  hospitalId,
  branchId,
  doctorId,
  slotId,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  slotId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(status: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await setSlotStatus({ hospitalId, branchId, doctorId, slotId, status });
        toast.success(status === "approved" ? "Slot approved." : "Slot rejected.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update slot.");
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" disabled={isPending} onClick={() => act("approved")}>
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("rejected")}>
        Reject
      </Button>
    </div>
  );
}
