"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@hms/shared";
import { NAV_ITEMS, ROLE_ICON, ROLE_LABEL } from "@/lib/nav-config";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { cn } from "@/lib/utils";

export function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const RoleIcon = ROLE_ICON[role];

  // Pick the single most specific href match so a sub-page (e.g. /admin/staff)
  // doesn't also leave the role's root item (e.g. Dashboard → /admin) lit up —
  // "/admin/staff" starts with "/admin/" too, so per-item prefix checks alone
  // would elevate both at once.
  const activeHref = NAV_ITEMS[role]
    .map((item) => item.href)
    .filter((href): href is string => Boolean(href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <RoleIcon className="size-4.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">HMS</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS[role].map((item) => {
            const active = Boolean(item.href) && item.href === activeHref;
            const Icon = item.icon;
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-sidebar-primary" />
                ) : null}
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </span>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-6 py-3.5 backdrop-blur supports-backdrop-filter:bg-card/60">
          <div className="flex items-center gap-2">
            <RoleIcon className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{ROLE_LABEL[role]} Dashboard</p>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
