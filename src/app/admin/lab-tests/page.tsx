import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchSwitcher } from "@/components/branch-switcher";
import { getSession } from "@/lib/auth/require-role";
import { listBranches } from "@/features/hospitals/services/read";
import { listLabTests } from "@/features/lab-tests/services/read";
import { LabTestFormDialog } from "@/features/lab-tests/components/LabTestFormDialog";
import { LabTestStatusToggle } from "@/features/lab-tests/components/LabTestStatusToggle";

export default async function LabTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const { branchId: branchIdParam } = await searchParams;
  const branches = await listBranches(hospitalId);
  const branch = branches.find((b) => b.id === branchIdParam) ?? branches[0];

  if (!branch) {
    return <p className="text-sm text-muted-foreground">No branches yet — add one under Hospitals.</p>;
  }

  const tests = await listLabTests(hospitalId, branch.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Lab Test Master</h1>
        <div className="flex items-center gap-2">
          <BranchSwitcher
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            selectedBranchId={branch.id}
            basePath="/admin/lab-tests"
          />
          <LabTestFormDialog hospitalId={hospitalId} branchId={branch.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test catalog — {branch.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No lab tests added yet.</p>
          ) : (
            tests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{test.name}</p>
                  <p className="text-muted-foreground">
                    {test.category} · {test.sampleType} · {test.price}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={test.status === "active" ? "success" : "destructive"} className="w-20 justify-center">{test.status}</Badge>
                  <LabTestFormDialog
                    hospitalId={hospitalId}
                    branchId={branch.id}
                    existing={{
                      id: test.id,
                      name: test.name,
                      category: test.category,
                      price: test.price,
                      sampleType: test.sampleType,
                    }}
                  />
                  <LabTestStatusToggle hospitalId={hospitalId} branchId={branch.id} testId={test.id} status={test.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
