"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { branchCollection } from "@hms/shared";

/**
 * Vitals recorded by Nurse must reach the Doctor in real time, no manual
 * refresh. Vitals are now embedded on the appointment document itself
 * (docs/10-collections-schema.md §10.6) — this listens on that single
 * document when `appointmentId` is known (patient-details page), or on the
 * whole branch's `appointments` collection when it isn't (the doctor
 * dashboard's queue view, watching for any patient's status to change).
 * Renders nothing; just calls router.refresh() whenever something changes,
 * re-pulling the server-rendered queue/patient data. Skips each listener's
 * initial (already-on-page-load) snapshot so mounting this doesn't trigger
 * an immediate redundant refresh.
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
    const onChange = () => {
      if (isFirstSnapshot.current) {
        isFirstSnapshot.current = false;
        return;
      }
      router.refresh();
    };

    const appointmentsCollection = branchCollection(hospitalId, branchId, "appointments");
    const unsubscribe = appointmentId
      ? onSnapshot(doc(db, appointmentsCollection, appointmentId), onChange)
      : onSnapshot(collection(db, appointmentsCollection), onChange);
    return unsubscribe;
  }, [hospitalId, branchId, appointmentId, router]);

  return null;
}
