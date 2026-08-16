import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function NurseLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["nurse"]);
  return <DashboardShell role={session.role}>{children}</DashboardShell>;
}
