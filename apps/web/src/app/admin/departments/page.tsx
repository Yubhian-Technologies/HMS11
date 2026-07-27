import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { CreateDepartmentDialog } from "@/features/departments/components/CreateDepartmentDialog";
import { EditDepartmentDialog } from "@/features/departments/components/EditDepartmentDialog";
import { DepartmentStatusToggle } from "@/features/departments/components/DepartmentStatusToggle";
import { listDepartments } from "@/features/departments/services/read";

export default async function DepartmentsPage() {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const departments = await listDepartments(hospitalId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Departments</h1>
        <CreateDepartmentDialog hospitalId={hospitalId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {departments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No departments yet. Doctors need a department before they can be added.
            </p>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <p className="font-medium text-foreground">{dept.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={dept.status === "active" ? "success" : "destructive"} className="w-20 justify-center">{dept.status}</Badge>
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
