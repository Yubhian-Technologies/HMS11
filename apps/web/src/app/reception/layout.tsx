import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function ReceptionLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["reception"]);
  return <DashboardShell role={session.role}>{children}</DashboardShell>;
}
