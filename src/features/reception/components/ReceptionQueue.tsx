"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckInButton } from "@/features/appointments/components/CheckInButton";
import { RecordVitalsDialog } from "@/features/nurse/components/RecordVitalsDialog";
import type { AppointmentRecord } from "@/features/appointments/services/read";
import { UserCheck, Users, Calendar, Stethoscope } from "lucide-react";

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

interface DoctorSummary {
  id: string;
  name: string;
  specialization: string;
}

interface UpcomingDay {
  date: string;
  label: string;
  appointments: AppointmentRecord[];
}

export function ReceptionQueue({
  hospitalId,
  branchId,
  doctors,
  todaysAppointments,
  upcomingDays,
}: {
  hospitalId: string;
  branchId: string;
  doctors: DoctorSummary[];
  todaysAppointments: AppointmentRecord[];
  upcomingDays: UpcomingDay[];
}) {
  const [sessionFilter, setSessionFilter] = useState<"all" | "morning" | "afternoon">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "BOOKED" | "CHECKED_IN" | "VITALS_COMPLETED" | "CONSULTING">("all");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");

  const morningCount = todaysAppointments.filter((a) => a.session === "morning").length;
  const afternoonCount = todaysAppointments.filter((a) => a.session === "afternoon").length;

  const filteredPatients = todaysAppointments.filter((a) => {
    if (sessionFilter !== "all" && a.session !== sessionFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const upcomingCount = upcomingDays.reduce((sum, d) => sum + d.appointments.length, 0);

  function StatusBadge({ status, token }: { status: string; token?: number | string }) {
    switch (status) {
      case "BOOKED":
        return <Badge variant="outline">Booked</Badge>;
      case "CHECKED_IN":
        return <Badge variant="secondary">Checked In (Needs Vitals)</Badge>;
      case "VITALS_COMPLETED":
        return <Badge variant="default" className="bg-emerald-600">Sent to Doctor Queue #{token ?? ""}</Badge>;
      case "CONSULTING":
        return <Badge variant="secondary" className="bg-blue-600 text-white">In Consultation</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function Row({ appt }: { appt: AppointmentRecord }) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{appt.patientName}</p>
            {appt.type === "emergency" ? <Badge variant="destructive">EMERGENCY</Badge> : null}
            {appt.checkIn?.token ? <Badge variant="default">Token #{appt.checkIn.token}</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {appt.session ? SESSION_LABEL[appt.session] : "—"} · Status: <StatusBadge status={appt.status} token={appt.checkIn?.token} />
          </p>
          {appt.vitals ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Vitals: BP {appt.vitals.bloodPressure} · Pulse {appt.vitals.pulse} · SpO2 {appt.vitals.spo2}%
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {appt.status === "BOOKED" ? (
            <CheckInButton hospitalId={hospitalId} branchId={branchId} appointmentId={appt.id} />
          ) : appt.status === "CHECKED_IN" ? (
            <RecordVitalsDialog
              hospitalId={hospitalId}
              branchId={branchId}
              appointmentId={appt.id}
              patientName={appt.patientName}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="doctors" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="doctors" className="gap-2">
          <Stethoscope className="size-4" /> Doctors Queue
        </TabsTrigger>
        <TabsTrigger value="patients" className="gap-2">
          <Users className="size-4" /> Patients Queue ({todaysAppointments.length})
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="gap-2">
          <Calendar className="size-4" /> Upcoming ({upcomingCount})
        </TabsTrigger>
      </TabsList>

      {/* DOCTORS QUEUE VIEW */}
      <TabsContent value="doctors" className="mt-4 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" /> Doctor-wise Queues Today
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedDoctorId === "all" ? "default" : "outline"}
              onClick={() => setSelectedDoctorId("all")}
            >
              All Doctors ({doctors.length})
            </Button>
            {doctors.map((doc) => (
              <Button
                key={doc.id}
                size="sm"
                variant={selectedDoctorId === doc.id ? "default" : "outline"}
                onClick={() => setSelectedDoctorId(doc.id)}
              >
                {doc.name}
              </Button>
            ))}
          </div>
        </div>

        {doctors
          .filter((doc) => selectedDoctorId === "all" || selectedDoctorId === doc.id)
          .map((doc) => {
            const docAppts = todaysAppointments.filter((a) => a.doctorId === doc.id);
            const vitalsDoneCount = docAppts.filter((a) => a.status === "VITALS_COMPLETED").length;
            const consultingCount = docAppts.filter((a) => a.status === "CONSULTING").length;

            return (
              <Card key={doc.id} className="border-sidebar-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Stethoscope className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{doc.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">{docAppts.length} total</Badge>
                    <Badge variant="default" className="bg-emerald-600">{vitalsDoneCount} in queue</Badge>
                    {consultingCount > 0 ? <Badge variant="secondary" className="bg-blue-600 text-white">{consultingCount} consulting</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-0">
                  {docAppts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No patients assigned to this doctor today.</p>
                  ) : (
                    docAppts.map((appt) => <Row key={appt.id} appt={appt} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
      </TabsContent>

      {/* PATIENTS QUEUE VIEW */}
      <TabsContent value="patients" className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Session:</span>
            <Button size="sm" variant={sessionFilter === "all" ? "default" : "outline"} onClick={() => setSessionFilter("all")}>
              All ({todaysAppointments.length})
            </Button>
            <Button size="sm" variant={sessionFilter === "morning" ? "default" : "outline"} onClick={() => setSessionFilter("morning")}>
              Morning ({morningCount})
            </Button>
            <Button size="sm" variant={sessionFilter === "afternoon" ? "default" : "outline"} onClick={() => setSessionFilter("afternoon")}>
              Afternoon ({afternoonCount})
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
              All
            </Button>
            <Button size="sm" variant={statusFilter === "BOOKED" ? "default" : "outline"} onClick={() => setStatusFilter("BOOKED")}>
              Booked
            </Button>
            <Button size="sm" variant={statusFilter === "CHECKED_IN" ? "default" : "outline"} onClick={() => setStatusFilter("CHECKED_IN")}>
              Checked In
            </Button>
            <Button size="sm" variant={statusFilter === "VITALS_COMPLETED" ? "default" : "outline"} onClick={() => setStatusFilter("VITALS_COMPLETED")}>
              Vitals Sent
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Patient Appointments Today</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {filteredPatients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No patients matching current filter.</p>
            ) : (
              filteredPatients.map((appt) => <Row key={appt.id} appt={appt} />)
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* UPCOMING DAYS VIEW */}
      <TabsContent value="upcoming" className="mt-4 flex flex-col gap-4">
        {upcomingDays.map((day) => (
          <Card key={day.date}>
            <CardHeader>
              <CardTitle className="text-base">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {day.appointments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing booked yet.</p>
              ) : (
                day.appointments.map((appt) => <Row key={appt.id} appt={appt} />)
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
