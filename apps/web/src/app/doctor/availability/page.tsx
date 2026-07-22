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
import { listRequestsForDoctor } from "@/features/availability-requests/services/read";
import { RespondAvailabilityDialog } from "@/features/availability-requests/components/RespondAvailabilityDialog";

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
  const [templates, slots, availabilityRequests] = await Promise.all([
    listTemplatesForDoctor(doctorId),
    listSlotsForDoctorInRange(doctorId, dates),
    // Isolated: this is a newer collection than templates/slots — if its
    // composite index hasn't been deployed yet, that must not crash the
    // whole page and take the (working) template/slot sections down with it.
    listRequestsForDoctor(doctorId).catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">My Availability</h1>
        <CreateTemplateDialog hospitalId={hospitalId} branchId={branchId} doctorId={doctorId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability Requests from Office</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {availabilityRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests from Office yet.</p>
          ) : (
            availabilityRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{req.date}</p>
                  <p className="text-muted-foreground">
                    Requested {req.morningRequested} morning / {req.afternoonRequested} afternoon
                  </p>
                  {req.status === "responded" ? (
                    <p className="text-foreground">
                      You confirmed {req.morningAvailable} morning / {req.afternoonAvailable} afternoon —{" "}
                      {req.isAvailable ? "Available" : "Not available"}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={req.status === "responded" ? "default" : "destructive"}>{req.status}</Badge>
                  {req.status === "pending" ? (
                    <RespondAvailabilityDialog
                      hospitalId={hospitalId}
                      requestId={req.id}
                      morningRequested={req.morningRequested}
                      afternoonRequested={req.afternoonRequested}
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
                  {WEEKDAY_LABEL[tpl.weekday]} · {tpl.morningSlots} morning / {tpl.afternoonSlots} afternoon ·{" "}
                  {tpl.slotDurationMinutes}min slots
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={tpl.status === "active" ? "success" : "destructive"} className="w-20 justify-center">{tpl.status}</Badge>
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
