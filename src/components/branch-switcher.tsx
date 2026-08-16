"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Every branch-scoped catalog page (Settings, Rooms & Beds, Lab Test
 * Master, Medicine Inventory) needs one of these — Admin manages potentially
 * several branches per hospital and each catalog is scoped to one branch at
 * a time (FR-3.4–3.6). Drives the page via the `branchId` search param so
 * the server component re-fetches on change.
 */
export function BranchSwitcher({
  branches,
  selectedBranchId,
  basePath,
}: {
  branches: { id: string; name: string }[];
  selectedBranchId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <Select
      items={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
      value={selectedBranchId}
      onValueChange={(value) => {
        if (value) router.push(`${basePath}?branchId=${value}`);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
