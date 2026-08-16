"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setDepartmentStatus } from "../services/departments";

export function DepartmentStatusToggle({
  hospitalId,
  departmentId,
  status,
}: {
  hospitalId: string;
  departmentId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setDepartmentStatus({ hospitalId, departmentId, status: nextStatus });
      toast.success(`Department ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update department status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Doctors can no longer be assigned to this department. No records are deleted."
      enableDescription="This department becomes active again."
    />
  );
}
