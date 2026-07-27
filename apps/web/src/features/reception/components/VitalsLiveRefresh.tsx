"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * FR-8.3 — vitals recorded by Reception must reach the Doctor in real time,
 * no manual refresh. Renders nothing; just keeps a live Firestore listener
 * (matching firestore.rules' branch-scoped vitals read clause exactly, so
 * the query is rule-satisfiable) and calls router.refresh() whenever
 * anything changes, re-pulling the server-rendered queue/patient data.
 * Skips the listener's initial (already-on-page-load) snapshot so mounting
 * this doesn't trigger an immediate redundant refresh.
 */
export function VitalsLiveRefresh({
  hospitalId,
  branchId,
  appointmentId,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId?: string;
}) {
  const router = useRouter();
  const isFirstSnapshot = useRef(true);

  useEffect(() => {
    isFirstSnapshot.current = true;
    const constraints = [where("hospitalId", "==", hospitalId), where("branchId", "==", branchId)];
    if (appointmentId) constraints.push(where("appointmentId", "==", appointmentId));
    const q = query(collection(db, "vitals"), ...constraints);

    const unsubscribe = onSnapshot(q, () => {
      if (isFirstSnapshot.current) {
        isFirstSnapshot.current = false;
        return;
      }
      router.refresh();
    });
    return unsubscribe;
  }, [hospitalId, branchId, appointmentId, router]);

  return null;
}
