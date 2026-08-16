import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<"neutral" | "info" | "warning" | "success" | "danger", string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/20 text-warning-foreground",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/10 text-destructive",
};

/** A single KPI number for a dashboard home-page stat row. Render several inside a grid. */
export function StatTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "neutral" | "info" | "warning" | "success" | "danger";
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-4 py-3.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
          <Icon className="size-4.5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Grid wrapper for a row of StatTiles — responsive 2/3/4-up. */
export function StatTileRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
