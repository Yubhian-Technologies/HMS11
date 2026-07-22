import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPatientAppointments } from "@/features/appointments/services/read";
import { listFeedbackByPatient } from "@/features/feedback/services/read";
import { SubmitFeedbackDialog } from "@/features/feedback/components/SubmitFeedbackDialog";

export default async function PatientFeedbackPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [appointments, feedback] = await Promise.all([
    listPatientAppointments(session.uid),
    listFeedbackByPatient(session.uid),
  ]);

  const completed = appointments.filter((a) => a.status === "completed");
  const feedbackByAppointment = new Map(feedback.map((f) => [f.appointmentId, f]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {completed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Feedback can be left once a visit is completed.
            </p>
          ) : (
            completed.map((appt) => {
              const existing = feedbackByAppointment.get(appt.id);
              return (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{appt.date}</p>
                    <p className="text-muted-foreground">
                      {appt.type === "emergency" ? "Emergency" : "Consultation"}
                    </p>
                  </div>
                  {existing ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{existing.rating} / 5</Badge>
                      {existing.isComplaint && <Badge variant="outline">{existing.status}</Badge>}
                    </div>
                  ) : (
                    <SubmitFeedbackDialog appointmentId={appt.id} />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
