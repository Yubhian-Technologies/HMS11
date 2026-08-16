import Link from "next/link";
import { Building2, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateHospitalDialog } from "@/features/hospitals/components/CreateHospitalDialog";
import { listHospitals } from "@/features/hospitals/services/read";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile, StatTileRow } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_DISABLED_STATUS_META } from "@/lib/status-meta";

export default async function SuperAdminPage() {
  const hospitals = await listHospitals();
  const activeCount = hospitals.filter((h) => h.status === "active").length;
  const disabledCount = hospitals.length - activeCount;
  const unassignedCount = hospitals.filter((h) => !h.adminUserId).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hospitals" description="Every hospital tenant on the platform." action={<CreateHospitalDialog />} />

      <StatTileRow>
        <StatTile icon={Building2} label="Total Hospitals" value={hospitals.length} tone="info" />
        <StatTile icon={ShieldCheck} label="Active" value={activeCount} tone="success" />
        <StatTile icon={ShieldOff} label="Disabled" value={disabledCount} tone="neutral" />
        <StatTile icon={UserCog} label="No Admin Assigned" value={unassignedCount} tone="warning" />
      </StatTileRow>

      {hospitals.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Building2} message="No hospitals yet. Create the first one to get started." />
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
                    <StatusBadge {...ACTIVE_DISABLED_STATUS_META[hospital.status]} />
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
