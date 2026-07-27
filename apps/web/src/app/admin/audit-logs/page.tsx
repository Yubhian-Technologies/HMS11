import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-role";
import { listAuditLogsForHospital } from "@/features/audit-logs/services/read";
import { AuditLogList } from "@/features/audit-logs/components/AuditLogList";

export default async function AdminAuditLogsPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");

  const logs = await listAuditLogsForHospital(session.hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
      <AuditLogList logs={logs} />
    </div>
  );
}
