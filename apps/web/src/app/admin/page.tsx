import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES: { href: string; title: string; description: string }[] = [
  { href: "/admin/staff", title: "Staff", description: "Manage Doctor, Office, Reception, Pharmacy, and Laboratory accounts." },
  { href: "/admin/departments", title: "Departments", description: "Manage departments doctors are assigned to." },
  { href: "/admin/rooms-beds", title: "Rooms & Beds", description: "Wards, rooms, and bed inventory per branch." },
  { href: "/admin/lab-tests", title: "Lab Test Master", description: "The lab test catalog doctors can order from." },
  { href: "/admin/medicine-inventory", title: "Medicine Inventory", description: "Stock levels and reorder thresholds per branch." },
  { href: "/admin/settings", title: "Settings", description: "Hospital timings and the holiday calendar." },
  { href: "/admin/billing", title: "Billing Overview", description: "Invoices and payment status across the branch." },
  { href: "/admin/feedback", title: "Feedback", description: "Patient feedback and complaints." },
  { href: "/admin/analytics", title: "Analytics", description: "Hospital-wide usage and performance stats." },
];

export default function AdminPage() {
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
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Audit Logs ships in a later module.
        </CardContent>
      </Card>
    </div>
  );
}
