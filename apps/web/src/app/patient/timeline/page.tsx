import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getPatientTimeline } from "@/features/timeline/services/read";

const TYPE_LABEL: Record<string, string> = {
  appointment: "Appointment",
  vitals: "Vitals",
  consultation: "Consultation",
  prescription: "Prescription",
  labReport: "Lab Report",
  admission: "Admission",
  discharge: "Discharge",
  followUp: "Follow-up",
};

export default async function PatientTimelinePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const entries = await getPatientTimeline(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Medical Timeline</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing recorded yet — your history will build up here as you visit hospitals on the
              platform.
            </p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 rounded-md border border-border p-3 text-sm">
                <Badge variant="default" className="h-fit shrink-0">
                  {TYPE_LABEL[entry.type]}
                </Badge>
                <div>
                  <p className="font-medium text-foreground">{entry.title}</p>
                  {entry.description ? <p className="text-muted-foreground">{entry.description}</p> : null}
                  <p className="text-xs text-muted-foreground">{entry.date}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
