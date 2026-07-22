import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/staff">
        <Card className="h-full transition-colors hover:border-foreground/30">
          <CardHeader>
            <CardTitle className="text-base">Staff</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manage Doctor, Office, Reception, Pharmacy, and Laboratory accounts (FR-3.1).
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/departments">
        <Card className="h-full transition-colors hover:border-foreground/30">
          <CardHeader>
            <CardTitle className="text-base">Departments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manage departments doctors are assigned to (FR-3.2).
          </CardContent>
        </Card>
      </Link>
      <Card className="sm:col-span-2 border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Rooms &amp; Beds, Lab Test Master, Medicine Inventory, Settings, Billing, Audit Logs, and
          Analytics ship in later modules — see docs/18-development-roadmap.md.
        </CardContent>
      </Card>
    </div>
  );
}
