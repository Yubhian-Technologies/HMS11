"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markNotificationRead } from "../services/notifications";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act() {
    startTransition(async () => {
      try {
        await markNotificationRead({ notificationId });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark as read.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={act}>
      Mark read
    </Button>
  );
}
