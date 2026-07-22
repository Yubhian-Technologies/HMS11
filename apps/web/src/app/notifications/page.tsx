import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-role";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkReadButton } from "@/features/notifications/components/MarkReadButton";
import { listNotifications } from "@/features/notifications/services/read";

/**
 * FR-16.2. A single shared route (not nested under any one role folder)
 * since every role receives notifications — DashboardShell picks the right
 * sidebar for whoever is signed in.
 */
export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await listNotifications(session.uid);

  return (
    <DashboardShell role={session.role}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{n.title}</p>
                      {!n.read && <Badge variant="secondary">New</Badge>}
                    </div>
                    <p className="text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <MarkReadButton notificationId={n.id} />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
