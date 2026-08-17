"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckInButton } from "@/features/appointments/components/CheckInButton";
import { RecordVitalsDialog } from "@/features/nurse/components/RecordVitalsDialog";
import type { AppointmentRecord } from "@/features/appointments/services/read";

const SESSION_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon" };

interface UpcomingDay {
  date: string;
  label: string;
  appointments: AppointmentRecord[];
}

/**
 * Reception's booking queue — Today (filterable by session) and Upcoming
 * (rest of the rolling 3-day window, grouped by day). All data is fetched
 * once server-side (see the parent page); this just handles which slice is
 * visible, entirely client-side — no data actually differs per tab/filter
 * click, so there's nothing to refetch.
 */
export function ReceptionQueue({
  hospitalId,
  branchId,
  todaysAppointments,
  upcomingDays,
}: {
  hospitalId: string;
  branchId: string;
  todaysAppointments: AppointmentRecord[];
  upcomingDays: UpcomingDay[];
}) {
  const [sessionFilter, setSessionFilter] = useState<"all" | "morning" | "afternoon">("all");

  const morningCount = todaysAppointments.filter((a) => a.session === "morning").length;
  const afternoonCount = todaysAppointments.filter((a) => a.session === "afternoon").length;
  const filtered =
    sessionFilter === "all" ? todaysAppointments : todaysAppointments.filter((a) => a.session === sessionFilter);
  const upcomingCount = upcomingDays.reduce((sum, d) => sum + d.appointments.length, 0);

  function Row({ appt }: { appt: AppointmentRecord }) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
        <div>
          <p className="font-medium text-foreground">
            {appt.patientName} {appt.type === "emergency" ? <Badge variant="destructive">EMERGENCY</Badge> : null}
          </p>
          <p className="text-muted-foreground">
            {appt.session ? SESSION_LABEL[appt.session] : "—"} · {appt.status}
          </p>
        </div>
        {appt.status === "BOOKED" ? (
          <CheckInButton hospitalId={hospitalId} branchId={branchId} appointmentId={appt.id} />
        ) : (
          <RecordVitalsDialog
            hospitalId={hospitalId}
            branchId={branchId}
            appointmentId={appt.id}
            patientName={appt.patientName}
          />
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="today">
      <TabsList>
        <TabsTrigger value="today">Today ({todaysAppointments.length})</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="mt-4 flex flex-col gap-4">
        <div className="flex gap-2">
          <Button size="sm" variant={sessionFilter === "all" ? "default" : "outline"} onClick={() => setSessionFilter("all")}>
            All ({todaysAppointments.length})
          </Button>
          <Button
            size="sm"
            variant={sessionFilter === "morning" ? "default" : "outline"}
            onClick={() => setSessionFilter("morning")}
          >
            Morning ({morningCount})
          </Button>
          <Button
            size="sm"
            variant={sessionFilter === "afternoon" ? "default" : "outline"}
            onClick={() => setSessionFilter("afternoon")}
          >
            Afternoon ({afternoonCount})
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              filtered.map((appt) => <Row key={appt.id} appt={appt} />)
            )}
          </CardContent>
        </Card>
      </TabsContent>

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
