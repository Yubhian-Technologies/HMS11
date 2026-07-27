"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setMedicineInventoryItemStatus } from "../services/medicineInventory";

export function MedicineInventoryStatusToggle({
  hospitalId,
  branchId,
  itemId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  itemId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setMedicineInventoryItemStatus({ hospitalId, branchId, itemId, status: nextStatus });
      toast.success(`Item ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Pharmacy will no longer be able to dispense this item. No records are deleted."
      enableDescription="This item becomes dispensable again."
    />
  );
}
