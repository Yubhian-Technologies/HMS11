import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditLogRecord } from "../services/read";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  create: "default",
  update: "secondary",
  statusChange: "secondary",
  delete: "destructive",
};

function toDateTimeLabel(ts: { toDate(): Date }): string {
  return ts.toDate().toLocaleString();
}

export function AuditLogList({ logs, showHospital }: { logs: AuditLogRecord[]; showHospital?: boolean }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No audit activity recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={ACTION_VARIANT[log.action] ?? "default"}>{log.action}</Badge>
                <span className="font-medium text-foreground">
                  {log.entityType} · {log.entityId}
                </span>
              </div>
              <p className="text-muted-foreground">
                by {log.actorRole} ({log.actorId})
                {showHospital ? ` · ${log.hospitalId}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{toDateTimeLabel(log.createdAt)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
