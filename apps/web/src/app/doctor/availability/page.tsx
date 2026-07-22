import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listSlotsForDoctorInRange, listTemplatesForDoctor } from "@/features/scheduling/services/read";
import { CreateTemplateDialog } from "@/features/scheduling/components/CreateTemplateDialog";
import { TemplateStatusToggle } from "@/features/scheduling/components/TemplateStatusToggle";
import { SlotApproveRejectButtons } from "@/features/scheduling/components/SlotApproveRejectButtons";
import { BulkApproveButton } from "@/features/scheduling/components/BulkApproveButton";

const WEEKDAY_LABEL: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default async function DoctorAvailabilityPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { uid: doctorId, hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const [templates, slots] = await Promise.all([
    listTemplatesForDoctor(doctorId),
    listSlotsForDoctorInRange(doctorId, dates),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">My Availability</h1>
        <CreateTemplateDialog hospitalId={hospitalId} branchId={branchId} doctorId={doctorId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recurring availability set yet.
            </p>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  {WEEKDAY_LABEL[tpl.weekday]} · {tpl.startTime}–{tpl.endTime} · {tpl.slotDurationMinutes}
                  min slots
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={tpl.status === "active" ? "default" : "destructive"}>{tpl.status}</Badge>
                  <TemplateStatusToggle hospitalId={hospitalId} templateId={tpl.id} status={tpl.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        const pendingCount = daySlots.filter((s) => s.status === "pendingApproval").length;
        return (
          <Card key={date}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
              {pendingCount > 0 ? (
                <BulkApproveButton hospitalId={hospitalId} doctorId={doctorId} date={date} />
              ) : null}
            </CardHeader>
            <CardContent>
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots for this day.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <span className="text-foreground">
                        {slot.startTime}–{slot.endTime}
                      </span>
                      <Badge
                        variant={
                          slot.status === "approved" || slot.status === "booked" ? "default" : "destructive"
                        }
                      >
                        {slot.status}
                      </Badge>
                      {slot.status === "pendingApproval" ? (
                        <SlotApproveRejectButtons hospitalId={hospitalId} slotId={slot.id} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
