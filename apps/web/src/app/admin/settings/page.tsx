import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchSwitcher } from "@/components/branch-switcher";
import { getSession } from "@/lib/auth/require-role";
import { listBranches } from "@/features/hospitals/services/read";
import { EditTimingsDialog } from "@/features/hospitals/components/EditTimingsDialog";
import { CreateHolidayDialog } from "@/features/holidays/components/CreateHolidayDialog";
import { HolidayStatusToggle } from "@/features/holidays/components/HolidayStatusToggle";
import { listHolidays } from "@/features/holidays/services/read";

const WEEKDAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const { branchId: branchIdParam } = await searchParams;
  const branches = await listBranches(hospitalId);
  const branch = branches.find((b) => b.id === branchIdParam) ?? branches[0];

  if (!branch) {
    return <p className="text-sm text-muted-foreground">No branches yet — add one under Hospitals.</p>;
  }

  const holidays = await listHolidays(branch.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <BranchSwitcher branches={branches} selectedBranchId={branch.id} basePath="/admin/settings" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Hospital Timings — {branch.name}</CardTitle>
          <EditTimingsDialog hospitalId={hospitalId} branchId={branch.id} timings={branch.timings} />
        </CardHeader>
        <CardContent>
          {branch.timings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timings set yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {branch.timings.map((t) => (
                <li key={t.day}>
                  <span className="font-medium">{WEEKDAY_LABEL[t.day]}</span> — {t.open} to {t.close}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Holiday Calendar — {branch.name}</CardTitle>
          <CreateHolidayDialog hospitalId={hospitalId} branchId={branch.id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {holidays.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No holidays added yet.</p>
          ) : (
            holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{holiday.date}</p>
                  <p className="text-muted-foreground">{holiday.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={holiday.status === "active" ? "default" : "destructive"}>
                    {holiday.status}
                  </Badge>
                  <HolidayStatusToggle hospitalId={hospitalId} holidayId={holiday.id} status={holiday.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
