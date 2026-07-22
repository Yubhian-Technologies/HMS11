"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setBranchStatus } from "../services/hospitals";

export function BranchStatusToggle({
  hospitalId,
  branchId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setBranchStatus({ hospitalId, branchId, status: nextStatus });
      toast.success(`Branch ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update branch status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Staff will no longer see this branch in queues/scheduling. No records are deleted."
      enableDescription="This branch becomes active again."
    />
  );
}
