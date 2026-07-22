"use client";

import { useTransition } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { logout } from "../actions/logout";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut(auth);
      await logout();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isPending}>
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
