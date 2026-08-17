import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel } from "@/lib/rolling-window";
import { listHospitals, listBranches } from "@/features/hospitals/services/read";
import { listPublicDepartments } from "@/features/departments/services/read";
import { listSlotsForBranchInRange } from "@/features/scheduling/services/read";
import { BookSlotButton } from "@/features/appointments/components/BookSlotButton";

type SearchParams = {
  hospitalId?: string;
  branchId?: string;
  departmentId?: string;
};

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

/**
 * Doctor-anonymous by design (see listBookableDepartments/bookAppointment
 * doc comments) — a patient picks a department, never a doctor. "General
 * Medicine" (if released) is offered first as the default; every other
 * released department is an optional specialization. Capacity shown per
 * (date, session) is summed across every doctor in that department — the
 * same pooled-capacity model bookAppointment auto-assigns against.
 */
export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const patientId = session.uid;

  const { hospitalId, branchId, departmentId } = await searchParams;

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
    const departments = await listPublicDepartments(hospitalId, branchId);
    const general = departments.filter((d) => d.isGeneral);
    const specializations = departments.filter((d) => !d.isGeneral);
    return (
      <div className="flex flex-col gap-6">
        {general.length > 0 && (
          <StepCard title="General consultation">
            {general.map((d) => (
              <StepLink
                key={d.id}
                href={`/patient/book?hospitalId=${hospitalId}&branchId=${branchId}&departmentId=${d.id}`}
                label={d.name}
              />
            ))}
          </StepCard>
        )}
        <StepCard title="Or choose a specialization (optional)">
          {specializations.map((d) => (
            <StepLink
              key={d.id}
              href={`/patient/book?hospitalId=${hospitalId}&branchId=${branchId}&departmentId=${d.id}`}
              label={d.name}
            />
          ))}
        </StepCard>
      </div>
    );
  }

  const dates = rollingWindowDates();
  const allSlots = (await listSlotsForBranchInRange(hospitalId, branchId, dates)).filter(
    (s) => s.status === "approved" && s.departmentId === departmentId,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Available Slots</h1>
      {dates.map((date, i) => {
        // Pool every doctor's remaining online capacity in this department
        // for this (date, session) into one number — matches exactly what
        // bookAppointment auto-assigns against, so what the patient sees
        // here is never more than what booking will actually honor.
        const bySession = new Map<string, number>();
        for (const slot of allSlots) {
          if (slot.date !== date) continue;
          const remaining = Math.max(0, slot.totalCount - slot.walkInReserved - slot.onlineBookedCount);
          if (remaining <= 0) continue;
          bySession.set(slot.session, (bySession.get(slot.session) ?? 0) + remaining);
        }
        const bookable = Array.from(bySession.entries());

        return (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">{formatDateLabel(date, i)}</CardTitle>
            </CardHeader>
            <CardContent>
              {bookable.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open sessions.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bookable.map(([session, availableCount]) => (
                    <div key={session} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <Badge variant="default">
                        {SESSION_LABEL[session]} — {availableCount} spots left
                      </Badge>
                      <BookSlotButton
                        hospitalId={hospitalId}
                        branchId={branchId}
                        departmentId={departmentId}
                        date={date}
                        session={session as "morning" | "afternoon"}
                        patientId={patientId}
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
