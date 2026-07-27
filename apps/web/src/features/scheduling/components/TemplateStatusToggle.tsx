"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setAvailabilityTemplateStatus } from "../services/scheduling";

export function TemplateStatusToggle({
  hospitalId,
  branchId,
  doctorId,
  templateId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  doctorId: string;
  templateId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setAvailabilityTemplateStatus({ hospitalId, branchId, doctorId, templateId, status: nextStatus });
      toast.success(`Template ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update template status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="This day stops generating new slots. Already-generated slots are unaffected."
      enableDescription="This day resumes generating slots each night."
    />
  );
}
