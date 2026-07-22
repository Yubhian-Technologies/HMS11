import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { getAppointment } from "@/features/appointments/services/read";
import { listSlotsForDoctorInRange } from "@/features/scheduling/services/read";
import { RescheduleSlotButton } from "@/features/appointments/components/RescheduleSlotButton";

export default async function RescheduleAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const { appointmentId } = await searchParams;
  if (!appointmentId) redirect("/office/appointments");

  const appointment = await getAppointment(appointmentId);
  if (!appointment) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const dates = rollingWindowDates();
  const slots = (await listSlotsForDoctorInRange(appointment.doctorId, dates)).filter(
    (s) => s.status === "approved",
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">
        Reschedule — {appointment.patientName}
      </h1>
      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent>
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open slots.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <Badge variant="default">
                        {slot.startTime}–{slot.endTime}
                      </Badge>
                      <RescheduleSlotButton
                        hospitalId={hospitalId}
                        appointmentId={appointment.id}
                        newSlotId={slot.id}
                        label="Move here"
                      />
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
