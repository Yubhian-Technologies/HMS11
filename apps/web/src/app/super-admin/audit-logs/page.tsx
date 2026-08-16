import { listAllAuditLogs } from "@/features/audit-logs/services/read";
import { AuditLogList } from "@/features/audit-logs/components/AuditLogList";
import { PageHeader } from "@/components/page-header";

export default async function SuperAdminAuditLogsPage() {
  const logs = await listAllAuditLogs();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Logs" description="Platform-wide write history across every hospital." />
      <AuditLogList logs={logs} showHospital />
    </div>
  );
}
