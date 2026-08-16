import type { ComponentType } from "react";
import { InboxIcon } from "lucide-react";

/** Replaces the hand-written "Nothing waiting." paragraph repeated across list pages. */
export function EmptyState({
  icon: Icon = InboxIcon,
  message,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  message: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 py-10 text-center ${className ?? ""}`}>
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
