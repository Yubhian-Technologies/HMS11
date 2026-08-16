"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { deleteHoliday } from "../services/holidays";

/**
 * The one true delete button in the app — holidays are the deliberate,
 * narrow exception to the no-hard-delete rule every other entity follows
 * (see deleteHoliday callable). This permanently removes the record, unlike
 * HolidayStatusToggle which only disables it.
 */
export function DeleteHolidayButton({
  hospitalId,
  branchId,
  holidayId,
}: {
  hospitalId: string;
  branchId: string;
  holidayId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteHoliday({ hospitalId, branchId, holidayId });
        toast.success("Holiday deleted.");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete holiday.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="w-20 justify-center" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this holiday?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the record — unlike Disable, this cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
