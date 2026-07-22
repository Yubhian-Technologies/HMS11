"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setHospitalStatus } from "../services/hospitals";

export function HospitalStatusToggle({
  hospitalId,
  status,
}: {
  hospitalId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setHospitalStatus({ hospitalId, status: nextStatus });
      toast.success(`Hospital ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update hospital status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Staff at this hospital will immediately lose access. No records are deleted (FR-2.6)."
      enableDescription="Staff at this hospital will regain access."
    />
  );
}
