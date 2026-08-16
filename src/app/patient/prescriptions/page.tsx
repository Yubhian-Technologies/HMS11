import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { listPatientPrescriptions } from "@/features/timeline/services/records";

export default async function PatientPrescriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const prescriptions = await listPatientPrescriptions(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Prescriptions</h1>
      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No prescriptions yet.
          </CardContent>
        </Card>
      ) : (
        prescriptions.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-2 pt-6 text-sm">
              {p.items.map((item, i) => (
                <div key={i} className="rounded-md border border-border p-2">
                  <p className="font-medium text-foreground">{item.medicineName}</p>
                  <p className="text-muted-foreground">
                    {item.dosage} · {item.frequency} · {item.durationDays} days
                    {item.instructions ? ` · ${item.instructions}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
