import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function LabLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["lab"]);
  return <DashboardShell role={session.role}>{children}</DashboardShell>;
}
