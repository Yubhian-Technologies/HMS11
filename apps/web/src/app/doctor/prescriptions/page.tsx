import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getAppointment } from "@/features/appointments/services/read";
import { getPatientHistory } from "@/features/consultations/services/read";

/**
 * Read-only — prescriptions originate only from the consult flow
 * (submitConsultation) now, not from a standalone "assign medicine" action
 * here, so a doctor can't create two prescriptions for the same visit
 * through two different paths. This page is where a doctor checks history.
 */
export default async function DoctorPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const { appointmentId } = await searchParams;
  if (!appointmentId) redirect("/doctor");

  const appointment = await getAppointment(hospitalId, branchId, appointmentId);
  if (!appointment || appointment.doctorId !== session.uid) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const history = await getPatientHistory(appointment.patientId, hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Prescriptions — {appointment.patientName}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prescriptions (from Consultations)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {history.prescriptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No prior prescriptions on file.</p>
          ) : (
            history.prescriptions.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3 text-sm">
                {p.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-foreground">{item.medicineName}</span>
                    <span className="text-muted-foreground">
                      {item.dosage} · {item.frequency} · {item.durationDays} days
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
