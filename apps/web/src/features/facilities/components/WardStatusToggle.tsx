"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setWardStatus } from "../services/facilities";

export function WardStatusToggle({
  hospitalId,
  branchId,
  wardId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  wardId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setWardStatus({ hospitalId, branchId, wardId, status: nextStatus });
      toast.success(`Ward ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ward status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Its rooms and beds stay listed but the ward is no longer active. No records are deleted."
      enableDescription="This ward becomes active again."
    />
  );
}
