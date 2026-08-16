import Link from "next/link";
import {
  BarChart3,
  BedDouble,
  FlaskConical,
  MessageSquare,
  Network,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

const MODULES: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  { href: "/admin/staff", title: "Staff", description: "Manage Doctor, Office, Reception, Pharmacy, and Laboratory accounts.", icon: Users },
  { href: "/admin/departments", title: "Departments", description: "Manage departments doctors are assigned to.", icon: Network },
  { href: "/admin/rooms-beds", title: "Rooms & Beds", description: "Wards, rooms, and bed inventory per branch.", icon: BedDouble },
  { href: "/admin/lab-tests", title: "Lab Test Master", description: "The lab test catalog doctors can order from.", icon: FlaskConical },
  { href: "/admin/medicine-inventory", title: "Medicine Inventory", description: "Stock levels and reorder thresholds per branch.", icon: Pill },
  { href: "/admin/settings", title: "Settings", description: "Hospital timings and the holiday calendar.", icon: Settings },
  { href: "/admin/billing", title: "Billing Overview", description: "Invoices and payment status across the branch.", icon: Receipt },
  { href: "/admin/feedback", title: "Feedback", description: "Patient feedback and complaints.", icon: MessageSquare },
  { href: "/admin/analytics", title: "Analytics", description: "Hospital-wide usage and performance stats.", icon: BarChart3 },
  { href: "/admin/audit-logs", title: "Audit Logs", description: "Every write made across the hospital.", icon: ScrollText },
];

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Dashboard" description="Manage this hospital's staff, facilities, and operations." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{m.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
