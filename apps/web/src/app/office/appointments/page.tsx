import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/require-role";
import { rollingWindowDates } from "@/lib/rolling-window";
import { listBranchAppointmentsForDates } from "@/features/appointments/services/read";
import { listWalkInPatients } from "@/features/patients/services/read";
import { listStaffByRole, listDoctorProfiles } from "@/features/staff/services/read";
import { AppointmentActionButtons } from "@/features/appointments/components/AppointmentActionButtons";
import { CheckInButton } from "@/features/appointments/components/CheckInButton";
import { CreateEmergencyDialog } from "@/features/appointments/components/CreateEmergencyDialog";

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

export default async function OfficeAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const { tab } = await searchParams;
  const defaultTab = tab === "emergency" || tab === "approved" ? tab : "pending";

  const dates = rollingWindowDates();
  const [appointments, patients, doctors, doctorProfiles] = await Promise.all([
    listBranchAppointmentsForDates(hospitalId, branchId, dates),
    listWalkInPatients(hospitalId, branchId),
    listStaffByRole(hospitalId, "doctor"),
    listDoctorProfiles(hospitalId, branchId),
  ]);
  const branchDoctors = doctors.filter((d) => d.branchId === branchId);
  const departmentIdByDoctor = new Map(doctorProfiles.map((p) => [p.id, p.departmentId]));

  const doctorProfilesById = new Map(doctors.map((d) => [d.id, d.name]));
  const pending = appointments.filter((a) => a.status === "PENDING");
  const approved = appointments.filter((a) => a.status === "BOOKED");
  const emergency = appointments.filter((a) => a.type === "emergency");

  function Row({ appt }: { appt: (typeof appointments)[number] }) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
        <div>
          <p className="font-medium text-foreground">
            {appt.patientName} {appt.type === "emergency" ? <Badge variant="destructive">EMERGENCY</Badge> : null}
          </p>
          <p className="text-muted-foreground">
            {doctorProfilesById.get(appt.doctorId) ?? "Unknown doctor"} · {appt.date} ·{" "}
            {appt.session ? SESSION_LABEL[appt.session] : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={appt.status === "BOOKED" ? "default" : "destructive"}>{appt.status}</Badge>
          <AppointmentActionButtons
            hospitalId={hospitalId}
            branchId={branchId}
            appointmentId={appt.id}
            status={appt.status}
          />
          {appt.status === "BOOKED" ? (
            <CheckInButton hospitalId={hospitalId} branchId={branchId} appointmentId={appt.id} />
          ) : null}
          {appt.status === "BOOKED" && appt.session ? (
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/office/appointments/reschedule?appointmentId=${appt.id}`} />}
            >
              Reschedule
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Appointments — Next 3 Days</h1>
        <CreateEmergencyDialog
          hospitalId={hospitalId}
          branchId={branchId}
          patients={patients.map((p) => ({ id: p.id, name: p.name }))}
          doctors={branchDoctors.map((d) => ({
            id: d.id,
            name: d.name,
            departmentId: departmentIdByDoctor.get(d.id) ?? "",
          }))}
        />
      </div>

      <Tabs key={defaultTab} defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="emergency">Emergency ({emergency.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending.</p>
              ) : (
                pending.map((a) => <Row key={a.id} appt={a} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {approved.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">None approved yet.</p>
              ) : (
                approved.map((a) => <Row key={a.id} appt={a} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emergency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {emergency.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No emergencies today.</p>
              ) : (
                emergency.map((a) => <Row key={a.id} appt={a} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
