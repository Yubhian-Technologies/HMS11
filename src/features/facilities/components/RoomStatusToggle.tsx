"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusToggle } from "@/components/status-toggle";
import { setRoomStatus } from "../services/facilities";

export function RoomStatusToggle({
  hospitalId,
  branchId,
  roomId,
  status,
}: {
  hospitalId: string;
  branchId: string;
  roomId: string;
  status: "active" | "disabled";
}) {
  const router = useRouter();

  async function handleToggle(nextStatus: "active" | "disabled") {
    try {
      await setRoomStatus({ hospitalId, branchId, roomId, status: nextStatus });
      toast.success(`Room ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update room status.");
    }
  }

  return (
    <StatusToggle
      status={status}
      onToggle={handleToggle}
      disableDescription="Its beds stay listed but the room is no longer active. No records are deleted."
      enableDescription="This room becomes active again."
    />
  );
}
