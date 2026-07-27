"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSlotStatus } from "../services/scheduling";

/** Office-only: block an active slot, or unblock one it previously blocked. */
export function BlockUnblockButton({
  hospitalId,
  branchId,
  doctorId,
  slotId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  slotId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status !== "blocked" && status !== "approved") return null;

  function handleClick() {
    startTransition(async () => {
      try {
        await setSlotStatus({
          hospitalId,
          branchId,
          doctorId,
          slotId,
          status: status === "blocked" ? "approved" : "blocked",
        });
        toast.success(status === "blocked" ? "Slot unblocked." : "Slot blocked.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update slot.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? "Working…" : status === "blocked" ? "Unblock" : "Block"}
    </Button>
  );
}
