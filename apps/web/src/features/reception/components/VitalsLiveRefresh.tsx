"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { branchCollection } from "@hms/shared";

/**
 * Vitals recorded by Nurse must reach the Doctor in real time, no manual
 * refresh. Vitals are now embedded on the appointment document itself
 * (docs/10-collections-schema.md §10.6) — this listens on that single
 * document when `appointmentId` is known (patient-details page), or on the
 * doctor's own appointments (the queue view) when it isn't.
 *
 * The queue watch is scoped with `where("doctorId", "==", doctorId)` because
 * the Firestore rules only allow a doctor to read appointment docs they own
 * (firestore.rules §appointments) — an unfiltered branch-wide collection
 * listen matches other doctors' docs and the whole query is rejected with
 * permission-denied. Firing off router.refresh() on every snapshot re-pulls
 * the server-rendered queue/patient data. Skips each listener's initial
 * (already-on-page-load) snapshot so mounting this doesn't trigger an
 * immediate redundant refresh.
 */
export function VitalsLiveRefresh({
  hospitalId,
  branchId,
  appointmentId,
  doctorId,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId?: string;
  doctorId?: string;
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
    // A denied listener throws inside snapshot — swallow it so a rules
    // regression logs once instead of blowing up the client console.
    const onError = () => {};

    const appointmentsCollection = branchCollection(hospitalId, branchId, "appointments");

    let unsubscribe: () => void;
    if (appointmentId) {
      unsubscribe = onSnapshot(doc(db, appointmentsCollection, appointmentId), onChange, onError);
    } else if (doctorId) {
      const doctorQuery = query(collection(db, appointmentsCollection), where("doctorId", "==", doctorId));
      unsubscribe = onSnapshot(doctorQuery, onChange, onError);
    } else {
      unsubscribe = onSnapshot(collection(db, appointmentsCollection), onChange, onError);
    }
    return unsubscribe;
  }, [hospitalId, branchId, appointmentId, doctorId, router]);

  return null;
}
