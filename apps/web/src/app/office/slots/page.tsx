import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listStaffByRole } from "@/features/staff/services/read";
import { listSlotsForBranchInRange } from "@/features/scheduling/services/read";
import { CreateManualSlotDialog } from "@/features/scheduling/components/CreateManualSlotDialog";
import { BlockUnblockButton } from "@/features/scheduling/components/BlockUnblockButton";

export default async function OfficeSlotsPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const [allDoctors, slots] = await Promise.all([
    listStaffByRole(hospitalId, "doctor"),
    listSlotsForBranchInRange(branchId, dates),
  ]);
  const doctors = allDoctors.filter((d) => d.branchId === branchId);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Slot Approval</h1>
        <CreateManualSlotDialog
          hospitalId={hospitalId}
          branchId={branchId}
          doctors={doctors.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>

      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        const byDoctor = new Map<string, typeof daySlots>();
        for (const slot of daySlots) {
          byDoctor.set(slot.doctorId, [...(byDoctor.get(slot.doctorId) ?? []), slot]);
        }

        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {byDoctor.size === 0 ? (
                <p className="text-sm text-muted-foreground">No slots for this day.</p>
              ) : (
                Array.from(byDoctor.entries()).map(([doctorId, doctorSlots]) => (
                  <div key={doctorId}>
                    <p className="mb-2 text-sm font-medium text-foreground">
                      {doctorName.get(doctorId) ?? doctorId}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {doctorSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                        >
                          <span className="text-foreground">
                            {slot.startTime}–{slot.endTime}
                          </span>
                          <Badge
                            variant={
                              slot.status === "approved" || slot.status === "booked"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {slot.status}
                          </Badge>
                          <BlockUnblockButton hospitalId={hospitalId} slotId={slot.id} status={slot.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
