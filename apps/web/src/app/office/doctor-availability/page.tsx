import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listStaffByRole } from "@/features/staff/services/read";
import { listRequestsForBranch } from "@/features/availability-requests/services/read";
import { CreateAvailabilityRequestDialog } from "@/features/availability-requests/components/CreateAvailabilityRequestDialog";

export default async function OfficeDoctorAvailabilityPage() {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const [allDoctors, requests] = await Promise.all([
    listStaffByRole(hospitalId, "doctor"),
    // Isolated: a missing/pending composite index on this newer collection
    // must degrade this one card, not crash the whole page.
    listRequestsForBranch(branchId).catch(() => []),
  ]);
  const doctors = allDoctors.filter((d) => d.branchId === branchId);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Doctor Availability</h1>
        <CreateAvailabilityRequestDialog
          hospitalId={hospitalId}
          branchId={branchId}
          doctors={doctors.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No availability requests sent yet.</p>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {doctorName.get(req.doctorId) ?? "Unknown doctor"} · {req.date}
                  </p>
                  <p className="text-muted-foreground">
                    Requested {req.morningRequested} morning / {req.afternoonRequested} afternoon
                  </p>
                  {req.status === "responded" ? (
                    <p className="text-foreground">
                      Confirmed {req.morningAvailable} morning / {req.afternoonAvailable} afternoon —{" "}
                      {req.isAvailable ? "Available" : "Not available"}
                    </p>
                  ) : null}
                </div>
                <Badge variant={req.status === "responded" ? "default" : "destructive"}>{req.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
