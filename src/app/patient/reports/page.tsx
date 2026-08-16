import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPatientLabReports } from "@/features/timeline/services/records";

export default async function PatientReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const reports = await listPatientLabReports(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{r.summaryNotes || "Lab report"}</p>
                </div>
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground underline underline-offset-4"
                >
                  View
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
