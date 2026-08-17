import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates, formatDateLabel, todayIsoClient } from "@/lib/rolling-window";
import { listBranchAppointmentsForDates } from "@/features/appointments/services/read";
import { ReceptionQueue } from "@/features/reception/components/ReceptionQueue";

/**
 * Reception's landing page — the whole booked-to-queued front-desk handoff
 * lives here: check a booked patient in, then record their vitals, which is
 * what actually sends them into the department doctor's queue (recordVitals
 * flips status to VITALS_COMPLETED — the doctor's queue is a live listener
 * on that same status, no separate "push to doctor" step). Both steps used
 * to be split across Office (check-in) and Nurse (vitals); Reception now
 * owns the whole handoff.
 */
export default async function ReceptionPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const dates = rollingWindowDates();
  const today = todayIsoClient();
  const raw = await listBranchAppointmentsForDates(hospitalId, branchId, dates);
  // Firestore Admin Timestamp instances aren't plain objects, so they can't
  // cross the Server -> Client Component boundary (ReceptionQueue is
  // "use client"); round-trip through JSON to strip them to plain data.
  const appointments = JSON.parse(JSON.stringify(raw)) as typeof raw;

  // Reception's own working set — a rejected/cancelled/expired booking, or
  // one already past vitals (already handed to the doctor), has nothing
  // left for the front desk to do with it.
  const active = appointments.filter((a) => a.status === "BOOKED" || a.status === "CHECKED_IN");
  const todaysAppointments = active.filter((a) => a.date === today);
  const upcomingDays = dates
    .filter((d) => d !== today)
    .map((date, i) => ({
      date,
      label: formatDateLabel(date, i + 1),
      appointments: active.filter((a) => a.date === date),
    }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Reception</h1>
      <ReceptionQueue
        hospitalId={hospitalId}
        branchId={branchId}
        todaysAppointments={todaysAppointments}
        upcomingDays={upcomingDays}
      />
    </div>
  );
}
