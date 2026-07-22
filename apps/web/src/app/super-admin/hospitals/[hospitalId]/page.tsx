import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AssignAdminDialog } from "@/features/hospitals/components/AssignAdminDialog";
import { BranchStatusToggle } from "@/features/hospitals/components/BranchStatusToggle";
import { CreateBranchDialog } from "@/features/hospitals/components/CreateBranchDialog";
import { HospitalStatusToggle } from "@/features/hospitals/components/HospitalStatusToggle";
import { getHospital, getUserById, listBranches } from "@/features/hospitals/services/read";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ hospitalId: string }>;
}) {
  const { hospitalId } = await params;
  const hospital = await getHospital(hospitalId);
  if (!hospital) notFound();

  const [branches, admin] = await Promise.all([
    listBranches(hospitalId),
    hospital.adminUserId ? getUserById(hospital.adminUserId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/super-admin" className="text-sm text-muted-foreground hover:underline">
        ← All hospitals
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{hospital.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={hospital.status === "active" ? "success" : "destructive"} className="w-20 justify-center">
                {hospital.status}
              </Badge>
              <HospitalStatusToggle hospitalId={hospital.id} status={hospital.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="grid gap-1 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Contact email: </span>
              {hospital.contactEmail}
            </div>
            <div>
              <span className="text-muted-foreground">Contact phone: </span>
              {hospital.contactPhone}
            </div>
            {hospital.registrationNumber ? (
              <div>
                <span className="text-muted-foreground">Registration #: </span>
                {hospital.registrationNumber}
              </div>
            ) : null}
            <div>
              <span className="text-muted-foreground">Address: </span>
              {hospital.address.line1}
              {hospital.address.line2 ? `, ${hospital.address.line2}` : ""}, {hospital.address.city},{" "}
              {hospital.address.state} {hospital.address.postalCode}, {hospital.address.country}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Hospital Admin</p>
              <p className="text-muted-foreground">
                {admin ? `${admin.name} (${admin.email})` : "No admin assigned yet"}
              </p>
            </div>
            <AssignAdminDialog hospitalId={hospital.id} hasExistingAdmin={Boolean(hospital.adminUserId)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Branches</CardTitle>
            <CreateBranchDialog hospitalId={hospital.id} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{branch.name}</p>
                <p className="text-muted-foreground">
                  {branch.address.city}, {branch.address.state} · {branch.contactPhone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={branch.status === "active" ? "success" : "destructive"} className="w-20 justify-center">
                  {branch.status}
                </Badge>
                <BranchStatusToggle hospitalId={hospital.id} branchId={branch.id} status={branch.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
