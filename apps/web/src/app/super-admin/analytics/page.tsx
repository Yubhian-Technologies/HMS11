import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformAnalytics } from "@/features/analytics/services/read";

export default async function SuperAdminAnalyticsPage() {
  const analytics = await getPlatformAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Platform Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hospitals</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">{analytics.hospitalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active users</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">{analytics.activeUserCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments (7d)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {analytics.appointmentVolume7d}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment volume, last 7 days (FR-19.1)</CardTitle>
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
