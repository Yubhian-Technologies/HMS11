import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listHospitals, listBranches } from "@/features/hospitals/services/read";
import { listDepartments } from "@/features/departments/services/read";
import { listDoctorsByDepartment } from "@/features/appointments/services/read";
import { listSlotsForDoctorInRange } from "@/features/scheduling/services/read";
import { BookSlotButton } from "@/features/appointments/components/BookSlotButton";
import { JoinWaitingListButton } from "@/features/appointments/components/JoinWaitingListButton";

type SearchParams = {
  hospitalId?: string;
  branchId?: string;
  departmentId?: string;
  doctorId?: string;
};

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const patientId = session.uid;

  const { hospitalId, branchId, departmentId, doctorId } = await searchParams;

  if (!hospitalId) {
    const hospitals = (await listHospitals()).filter((h) => h.status === "active");
    return (
      <StepCard title="Choose a hospital">
        {hospitals.map((h) => (
          <StepLink key={h.id} href={`/patient/book?hospitalId=${h.id}`} label={h.name} />
        ))}
      </StepCard>
    );
  }

  if (!branchId) {
    const branches = (await listBranches(hospitalId)).filter((b) => b.status === "active");
    return (
      <StepCard title="Choose a branch">
        {branches.map((b) => (
          <StepLink key={b.id} href={`/patient/book?hospitalId=${hospitalId}&branchId=${b.id}`} label={b.name} />
        ))}
      </StepCard>
    );
  }

  if (!departmentId) {
    const departments = (await listDepartments(hospitalId)).filter((d) => d.status === "active");
    return (
      <StepCard title="Choose a department">
        {departments.map((d) => (
          <StepLink
            key={d.id}
            href={`/patient/book?hospitalId=${hospitalId}&branchId=${branchId}&departmentId=${d.id}`}
            label={d.name}
          />
        ))}
      </StepCard>
    );
  }

  if (!doctorId) {
    const doctors = (await listDoctorsByDepartment(hospitalId, departmentId)).filter(
      (d) => d.profile.branchId === branchId,
    );
    return (
      <StepCard title="Choose a doctor">
        {doctors.map((d) => (
          <StepLink
            key={d.id}
            href={`/patient/book?hospitalId=${hospitalId}&branchId=${branchId}&departmentId=${departmentId}&doctorId=${d.id}`}
            label={`${d.name} — ${d.profile.specialization} — fee ${d.profile.consultationFee}`}
          />
        ))}
      </StepCard>
    );
  }

  const dates = rollingWindowDates();
  const slots = (await listSlotsForDoctorInRange(doctorId, dates)).filter((s) => s.status === "approved");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Available Slots</h1>
      {dates.map((date, i) => {
        const daySlots = slots.filter((s) => s.date === date);
        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent>
              {daySlots.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">No open slots.</p>
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
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <Badge variant="default">
                        {slot.startTime}–{slot.endTime}
                      </Badge>
                      <BookSlotButton
                        hospitalId={hospitalId}
                        branchId={branchId}
                        slotId={slot.id}
                        patientId={patientId}
                        departmentId={departmentId}
                        label="Book"
                        redirectTo="/patient"
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

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.isArray(children) && children.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing available.</p>
        ) : (
          children
        )}
      </CardContent>
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
