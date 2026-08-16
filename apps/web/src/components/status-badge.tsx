import { Badge } from "@/components/ui/badge";
import type { StatusMetaEntry, StatusTone } from "@/lib/status-meta";

const TONE_VARIANT: Record<StatusTone, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  neutral: "secondary",
  info: "default",
  warning: "warning",
  success: "success",
  danger: "destructive",
};

/** Renders a domain status consistently — pass the {label, tone} looked up from lib/status-meta.ts. */
export function StatusBadge({ label, tone, className }: StatusMetaEntry & { className?: string }) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={className}>
      {label}
    </Badge>
  );
}
