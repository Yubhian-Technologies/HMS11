"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logMedicineStatus } from "../services/recovery";

export function MedicineLogButtons({
  hospitalId,
  branchId,
  medicineLogId,
}: {
  hospitalId: string;
  branchId: string;
  medicineLogId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(patientStatus: "taken" | "missed" | "skipped") {
    startTransition(async () => {
      try {
        await logMedicineStatus({ hospitalId, branchId, medicineLogId, patientStatus });
        toast.success(`Marked ${patientStatus}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" disabled={isPending} onClick={() => act("taken")}>
        Taken
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("missed")}>
        Missed
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("skipped")}>
        Skipped
      </Button>
    </div>
  );
}
