import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listSlotsForDoctorInRange } from "@/features/scheduling/services/read";
import { BulkApproveButton } from "@/features/scheduling/components/BulkApproveButton";
import { SubmitSlotProposalDialog } from "@/features/scheduling/components/SubmitSlotProposalDialog";
import type { SlotRecord } from "@/features/scheduling/services/read";

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

const SLOT_STATUS_BADGE: Record<SlotRecord["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  proposed: { label: "Proposed by Office", variant: "outline" },
  doctorReviewed: { label: "Sent to Office", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  blocked: { label: "Blocked", variant: "destructive" },
};

export default async function DoctorAvailabilityPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { uid: doctorId, hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const slots = await listSlotsForDoctorInRange(hospitalId, branchId, doctorId, dates);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">My Availability</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slot Proposals from Office</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {slots.filter((s) => s.status === "proposed").length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No slot proposals from Office yet.
            </p>
          ) : (
            slots
              .filter((s) => s.status === "proposed")
              .map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {slot.date} · {SESSION_LABEL[slot.session]}
                    </p>
                    <p className="text-muted-foreground">{slot.totalCount} slots proposed</p>
                  </div>
                  <SubmitSlotProposalDialog
                    hospitalId={hospitalId}
                    branchId={branchId}
                    doctorId={doctorId}
                    slotId={slot.id}
                    date={slot.date}
                    session={slot.session}
                    totalCount={slot.totalCount}
                  />
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        const proposedCount = daySlots.filter((s) => s.status === "proposed").length;
        return (
          <Card key={date}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
              {proposedCount > 0 ? (
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
                        {SESSION_LABEL[slot.session]} · {slot.onlineBookedCount + slot.walkInBookedCount}/
                        {slot.totalCount} booked
                        {slot.status === "approved" && slot.walkInReserved > 0
                          ? ` (${slot.walkInReserved} for walk-ins)`
                          : ""}
                      </span>
                      <Badge variant={SLOT_STATUS_BADGE[slot.status].variant}>{SLOT_STATUS_BADGE[slot.status].label}</Badge>
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
