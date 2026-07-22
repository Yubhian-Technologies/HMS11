import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfficePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, Office</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Authentication and role-based access are live. Slot approval and
        appointment queues ship in Modules 5 and 7 (see
        docs/18-development-roadmap.md).
      </CardContent>
    </Card>
  );
}
