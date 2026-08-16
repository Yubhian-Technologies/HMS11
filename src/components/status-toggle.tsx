"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Status = "active" | "disabled";

/**
 * Shared enable/disable confirmation control — used anywhere a `status`
 * field toggles between "active"/"disabled" (hospitals, branches,
 * departments, staff, ...). No hard deletes anywhere in the domain layer
 * (NFR-7.1), so this is the only destructive-adjacent action most entities
 * ever get.
 */
export function StatusToggle({
  status,
  onToggle,
  disableDescription,
  enableDescription,
}: {
  status: Status;
  onToggle: (nextStatus: Status) => Promise<void>;
  disableDescription: string;
  enableDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nextStatus: Status = status === "active" ? "disabled" : "active";

  function handleConfirm() {
    startTransition(async () => {
      await onToggle(nextStatus);
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant={status === "active" ? "destructive" : "default"} size="sm" className="w-20 justify-center" />}
      >
        {status === "active" ? "Disable" : "Enable"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{status === "active" ? "Disable this?" : "Re-enable this?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {status === "active" ? disableDescription : (enableDescription ?? "Access will be restored.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Working…" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
