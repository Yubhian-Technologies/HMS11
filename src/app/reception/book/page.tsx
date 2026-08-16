import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listDepartments } from "@/features/departments/services/read";
import { listDoctorsByDepartment } from "@/features/appointments/services/read";
import { listSlotsForDoctorInRange } from "@/features/scheduling/services/read";
import { getPatientProfile } from "@/features/patients/services/read";
import { BookSlotButton } from "@/features/appointments/components/BookSlotButton";
import { JoinWaitingListButton } from "@/features/appointments/components/JoinWaitingListButton";

type SearchParams = { patientId?: string; departmentId?: string; doctorId?: string };

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

export default async function ReceptionBookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const { patientId, departmentId, doctorId } = await searchParams;
  if (!patientId) {
    return <p className="text-sm text-muted-foreground">Missing patient — start from the Patients list.</p>;
  }
  const patient = await getPatientProfile(patientId);
  if (!patient) {
    return <p className="text-sm text-muted-foreground">Patient not found.</p>;
  }

  const base = `/reception/book?patientId=${patientId}`;

  if (!departmentId) {
    const departments = (await listDepartments(hospitalId)).filter((d) => d.status === "active");
    return (
      <StepCard title={`Book for ${patient.name} — choose a department`}>
        {departments.map((d) => (
          <StepLink key={d.id} href={`${base}&departmentId=${d.id}`} label={d.name} />
        ))}
      </StepCard>
    );
  }

  if (!doctorId) {
    const doctors = await listDoctorsByDepartment(hospitalId, branchId, departmentId);
    return (
      <StepCard title="Choose a doctor">
        {doctors.map((d) => (
          <StepLink
            key={d.id}
            href={`${base}&departmentId=${departmentId}&doctorId=${d.id}`}
            label={`${d.name} — ${d.profile.specialization}`}
          />
        ))}
      </StepCard>
    );
  }

  const dates = rollingWindowDates();
  const slots = (await listSlotsForDoctorInRange(hospitalId, branchId, doctorId, dates)).filter(
    (s) => s.status === "approved",
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Book for {patient.name}</h1>
      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bookable = daySlots.filter((s) => s.status === "approved" && s.totalCount - s.onlineBookedCount - s.walkInBookedCount > 0);
                return bookable.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">No open sessions.</p>
                    <JoinWaitingListButton
                      hospitalId={hospitalId}
                      branchId={branchId}
                      patientId={patientId}
                      doctorId={doctorId}
                      departmentId={departmentId}
                      date={date}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {bookable.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                        <Badge variant="default">
                          {SESSION_LABEL[slot.session]} —{" "}
                          {slot.totalCount - slot.onlineBookedCount - slot.walkInBookedCount} spots left
                        </Badge>
                        <BookSlotButton
                          hospitalId={hospitalId}
                          branchId={branchId}
                          doctorId={doctorId}
                          date={slot.date}
                          session={slot.session}
                          patientId={patientId}
                          departmentId={departmentId}
                          label="Book"
                          redirectTo="/reception/patients"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

function StepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-md border border-border p-3 text-sm text-foreground hover:bg-muted">
      {label}
    </Link>
  );
}
