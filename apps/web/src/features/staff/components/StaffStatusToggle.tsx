"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setStaffStatus } from "../services/staff";

export function StaffStatusToggle({
  hospitalId,
  uid,
  status,
}: {
  hospitalId: string;
  uid: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setStaffStatus({ uid, hospitalId, status: nextStatus });
      toast.success(`Account ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="This person will be signed out and unable to log in. No records are deleted."
      enableDescription="This person regains access."
    />
  );
}
