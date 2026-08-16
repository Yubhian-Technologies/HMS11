import { Building2, CalendarCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformAnalytics } from "@/features/analytics/services/read";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile, StatTileRow } from "@/components/stat-tile";

export default async function SuperAdminAnalyticsPage() {
  const analytics = await getPlatformAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Platform Analytics" />

      <StatTileRow>
        <StatTile icon={Building2} label="Hospitals" value={analytics.hospitalCount} tone="info" />
        <StatTile icon={Users} label="Active Users" value={analytics.activeUserCount} tone="info" />
        <StatTile icon={CalendarCheck} label="Appointments (7d)" value={analytics.appointmentVolume7d} tone="success" />
      </StatTileRow>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment volume, last 7 days (FR-19.1)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.trend.length === 0 ? (
            <EmptyState icon={CalendarCheck} message="No data yet — rollUpDailyStats runs nightly." />
          ) : (
            <div className="flex flex-col gap-2">
              {analytics.trend.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{point.date}</span>
                  <span className="font-medium text-foreground">{point.appointments} appointments</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
