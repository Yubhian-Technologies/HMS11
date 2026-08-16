import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES: { href: string; title: string; description: string }[] = [
  { href: "/office/slots", title: "Slot Approval", description: "Propose slot capacity, review doctor responses, and release slots to the public." },
  { href: "/office/appointments", title: "Appointments", description: "Approve or reject patient-booked appointments." },
  { href: "/office/appointments?tab=emergency", title: "Emergency Queue", description: "Emergency check-ins — no approval needed, highest priority." },
  { href: "/office/daily-schedule", title: "Daily Schedule", description: "Chronological view of confirmed appointments across all doctors." },
  { href: "/office/waiting-list", title: "Waiting List", description: "Patients waiting for a slot to open up for their doctor." },
  { href: "/office/lab-payments", title: "Lab Payments", description: "Collect payment for doctor-assigned lab orders before they reach the lab." },
];

export default function OfficePage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MODULES.map((m) => (
        <Link key={m.href} href={m.href}>
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle className="text-base">{m.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{m.description}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
