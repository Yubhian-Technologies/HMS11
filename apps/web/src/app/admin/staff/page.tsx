import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/lib/auth/require-role";
import { listBranches } from "@/features/hospitals/services/read";
import { listDepartments } from "@/features/departments/services/read";
import { listStaffByRole, listDoctorProfiles } from "@/features/staff/services/read";
import { CreateDoctorDialog } from "@/features/staff/components/CreateDoctorDialog";
import { CreateStaffDialog } from "@/features/staff/components/CreateStaffDialog";
import { StaffStatusToggle } from "@/features/staff/components/StaffStatusToggle";

const NON_DOCTOR_ROLES = ["office", "reception", "pharmacy", "lab"] as const;

export default async function StaffPage() {
  const session = await getSession();
  const hospitalId = session?.hospitalId;
  if (!hospitalId) redirect("/login");

  const [branches, departments, doctors, doctorProfiles, office, reception, pharmacy, lab] =
    await Promise.all([
      listBranches(hospitalId),
      listDepartments(hospitalId),
      listStaffByRole(hospitalId, "doctor"),
      listDoctorProfiles(hospitalId),
      listStaffByRole(hospitalId, "office"),
      listStaffByRole(hospitalId, "reception"),
      listStaffByRole(hospitalId, "pharmacy"),
      listStaffByRole(hospitalId, "lab"),
    ]);

  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  // Client Components can only receive plain-serializable props — strip
  // Firestore Timestamp fields (createdAt/updatedAt etc.) rather than
  // passing the full record (docs/11-folder-structure.md: server data
  // fetched in page.tsx, only what's needed crosses the client boundary).
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));
  const departmentOptions = departments.map((d) => ({ id: d.id, name: d.name }));
  const profileByUid = new Map(doctorProfiles.map((p) => [p.id, p]));
  const staffByRole = { office, reception, pharmacy, lab };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Staff</h1>

      <Tabs defaultValue="doctors">
        <TabsList>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="office">Office</TabsTrigger>
          <TabsTrigger value="reception">Reception</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
          <TabsTrigger value="lab">Laboratory</TabsTrigger>
        </TabsList>

        <TabsContent value="doctors" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Doctors</CardTitle>
              <CreateDoctorDialog hospitalId={hospitalId} branches={branchOptions} departments={departmentOptions} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {doctors.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No doctors yet.</p>
              ) : (
                doctors.map((doctor) => {
                  const profile = profileByUid.get(doctor.id);
                  return (
                    <div
                      key={doctor.id}
                      className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{doctor.name}</p>
                        <p className="text-muted-foreground">
                          {doctor.email} · {branchName.get(doctor.branchId ?? "") ?? "—"}
                          {profile ? (
                            <>
                              {" "}
                              · {departmentName.get(profile.departmentId) ?? "—"} · {profile.specialization} ·
                              fee {profile.consultationFee}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={doctor.status === "active" ? "success" : "destructive"} className="w-20 justify-center">
                          {doctor.status}
                        </Badge>
                        <StaffStatusToggle hospitalId={hospitalId} uid={doctor.id} status={doctor.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {NON_DOCTOR_ROLES.map((role) => (
          <TabsContent key={role} value={role} className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base capitalize">{role}</CardTitle>
                <CreateStaffDialog hospitalId={hospitalId} role={role} branches={branchOptions} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {staffByRole[role].length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No {role} staff yet.</p>
                ) : (
                  staffByRole[role].map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-muted-foreground">
                          {member.email} · {branchName.get(member.branchId ?? "") ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.status === "active" ? "success" : "destructive"} className="w-20 justify-center">
                          {member.status}
                        </Badge>
                        <StaffStatusToggle hospitalId={hospitalId} uid={member.id} status={member.status} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
