"use client";

import { useTransition } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { logout } from "../actions/logout";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut(auth);
      await logout();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isPending} className={className}>
      <LogOut className="size-4 shrink-0" />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
