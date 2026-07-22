import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateHospitalDialog } from "@/features/hospitals/components/CreateHospitalDialog";
import { listHospitals } from "@/features/hospitals/services/read";

export default async function SuperAdminPage() {
  const hospitals = await listHospitals();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Hospitals</h1>
        <CreateHospitalDialog />
      </div>

      {hospitals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hospitals yet. Create the first one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.map((hospital) => (
            <Link key={hospital.id} href={`/super-admin/hospitals/${hospital.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{hospital.name}</CardTitle>
                    <Badge variant={hospital.status === "active" ? "default" : "destructive"}>
                      {hospital.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{hospital.contactEmail}</span>
                  <span>{hospital.contactPhone}</span>
                  <span>{hospital.adminUserId ? "Admin assigned" : "No admin assigned yet"}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
