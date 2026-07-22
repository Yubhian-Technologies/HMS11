import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getHospitalAnalytics } from "@/features/analytics/services/read";

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");

  const analytics = await getHospitalAnalytics(session.hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments (7d)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">{analytics.appointments7d}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue (7d)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">{analytics.revenue7d}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor utilization</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {pct(analytics.doctorUtilizationRate)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bed occupancy</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {pct(analytics.bedOccupancyRate)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment volume, last 7 days (FR-19.2)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.trend.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No data yet — rollUpDailyStats runs nightly.
            </p>
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
