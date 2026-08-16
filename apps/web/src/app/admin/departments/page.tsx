import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { CreateDepartmentDialog } from "@/features/departments/components/CreateDepartmentDialog";
import { EditDepartmentDialog } from "@/features/departments/components/EditDepartmentDialog";
import { DepartmentStatusToggle } from "@/features/departments/components/DepartmentStatusToggle";
import { listDepartments } from "@/features/departments/services/read";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_DISABLED_STATUS_META } from "@/lib/status-meta";

export default async function DepartmentsPage() {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const departments = await listDepartments(hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Departments" action={<CreateDepartmentDialog hospitalId={hospitalId} />} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {departments.length === 0 ? (
            <EmptyState
              icon={Network}
              message="No departments yet. Doctors need a department before they can be added."
            />
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{dept.name}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge {...ACTIVE_DISABLED_STATUS_META[dept.status]} />
                  <EditDepartmentDialog hospitalId={hospitalId} departmentId={dept.id} name={dept.name} />
                  <DepartmentStatusToggle hospitalId={hospitalId} departmentId={dept.id} status={dept.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
