import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listComplaints } from "@/features/feedback/services/read";
import { ResolveFeedbackButtons } from "@/features/feedback/components/ResolveFeedbackButtons";

export default async function AdminFeedbackPage() {
  const session = await getSession();
  if (!session?.hospitalId) redirect("/login");
  const { hospitalId } = session;

  const complaints = await listComplaints(hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Feedback & Complaints</h1>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {complaints.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No complaints raised.</p>
          ) : (
            complaints.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-4 rounded-md border border-border p-3 text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{f.rating} / 5</p>
                    <Badge variant={f.status === "open" ? "destructive" : "secondary"}>{f.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">{f.comment || "No comment provided."}</p>
                </div>
                <ResolveFeedbackButtons hospitalId={hospitalId} feedbackId={f.id} status={f.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
