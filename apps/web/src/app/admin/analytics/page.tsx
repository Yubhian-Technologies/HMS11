import { redirect } from "next/navigation";
import { BedDouble, CalendarCheck, Receipt, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getHospitalAnalytics } from "@/features/analytics/services/read";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile, StatTileRow } from "@/components/stat-tile";

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");

  const analytics = await getHospitalAnalytics(session.hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" />

      <StatTileRow>
        <StatTile icon={CalendarCheck} label="Appointments (7d)" value={analytics.appointments7d} tone="info" />
        <StatTile icon={Receipt} label="Revenue (7d)" value={analytics.revenue7d} tone="success" />
        <StatTile icon={Stethoscope} label="Doctor Utilization" value={pct(analytics.doctorUtilizationRate)} tone="info" />
        <StatTile icon={BedDouble} label="Bed Occupancy" value={pct(analytics.bedOccupancyRate)} tone="info" />
      </StatTileRow>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment volume, last 7 days (FR-19.2)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.trend.length === 0 ? (
            <EmptyState icon={CalendarCheck} message="No data yet — rollUpDailyStats runs nightly." />
          ) : (
            <div className="flex flex-col gap-2">
              {analytics.trend.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{point.date}</span>
                  <span className="font-medium text-foreground">
                    {point.appointments} appointments · {point.revenue} revenue
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
