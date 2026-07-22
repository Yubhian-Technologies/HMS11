import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["super_admin"]);
  return <DashboardShell role={session.role}>{children}</DashboardShell>;
}
