"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setLabTestStatus } from "../services/labTests";

export function LabTestStatusToggle({
  hospitalId,
  testId,
  status,
}: {
  hospitalId: string;
  testId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setLabTestStatus({ hospitalId, testId, status: nextStatus });
      toast.success(`Test ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update test status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Doctors will no longer be able to order this test. No records are deleted."
      enableDescription="This test becomes orderable again."
    />
  );
}
