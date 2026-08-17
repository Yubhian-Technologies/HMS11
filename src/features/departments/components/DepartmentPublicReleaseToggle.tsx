"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setDepartmentPublicRelease } from "../services/departments";

/** Office's "release to public" button — per department, per branch. */
export function DepartmentPublicReleaseToggle({
  hospitalId,
  branchId,
  departmentId,
  publiclyBookable,
}: {
  hospitalId: string;
  branchId: string;
  departmentId: string;
  publiclyBookable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !publiclyBookable;
    startTransition(async () => {
      try {
        await setDepartmentPublicRelease({ hospitalId, branchId, departmentId, publiclyBookable: next });
        toast.success(next ? "Released to public booking." : "Pulled back from public booking.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update public release.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant={publiclyBookable ? "outline" : "default"}
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "…" : publiclyBookable ? "Release ON — click to pull back" : "Release to public"}
    </Button>
  );
}
