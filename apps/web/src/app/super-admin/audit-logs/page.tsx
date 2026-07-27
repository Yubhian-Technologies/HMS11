import { listAllAuditLogs } from "@/features/audit-logs/services/read";
import { AuditLogList } from "@/features/audit-logs/components/AuditLogList";

export default async function SuperAdminAuditLogsPage() {
  const logs = await listAllAuditLogs();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
      <AuditLogList logs={logs} showHospital />
    </div>
  );
}
