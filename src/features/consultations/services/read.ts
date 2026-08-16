import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Prescription, LabOrder, Admission } from "@hms/shared";

export type PrescriptionRecord = Prescription & { id: string };
export type LabOrderRecord = LabOrder & { id: string };
export type AdmissionRecord = Admission & { id: string };

export interface PatientHistory {
  prescriptions: PrescriptionRecord[];
  labOrders: LabOrderRecord[];
  admissions: AdmissionRecord[];
}

/**
 * Scoped to this hospital only — a doctor sees history within their own
 * hospital; cross-hospital clinical record sharing is out of scope (see
 * docs/02-missing-features.md). There is no more standalone `consultations`
 * collection — a past visit's diagnosis/notes now live as the embedded
 * `consultationSummary` on that visit's own `appointments` document
 * (docs/10-collections-schema.md §10.6), so "consultation history" is really
 * "past appointments with a consultationSummary," fetched via
 * `listPastConsultedAppointments` below instead of a separate query here.
 * `prescriptions`/`labOrders`/`admissions` are nested per branch now but
 * queried across the whole hospital here (a patient may have visited more
 * than one branch of the same hospital), so this uses `collectionGroup()`
 * filtered back down to `hospitalId`.
 */
export async function getPatientHistory(patientId: string, hospitalId: string): Promise<PatientHistory> {
  const db = getAdminDb();
  const [presSnap, labSnap, admSnap] = await Promise.all([
    db
      .collectionGroup("prescriptions")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collectionGroup("labOrders")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collectionGroup("admissions")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
  ]);

  return {
    prescriptions: presSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Prescription) })),
    labOrders: labSnap.docs.map((d) => ({ id: d.id, ...(d.data() as LabOrder) })),
    admissions: admSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Admission) })),
  };
}

export interface PastConsultation {
  appointmentId: string;
  diagnosis: string;
  clinicalNotes: string;
  completedAt: unknown;
}

/** Past visits at this hospital that reached a consultation — replaces the old `consultations` history list. */
export async function listPastConsultedAppointments(
  patientId: string,
  hospitalId: string,
): Promise<PastConsultation[]> {
  const snap = await getAdminDb()
    .collectionGroup("appointments")
    .where("patientId", "==", patientId)
    .where("hospitalId", "==", hospitalId)
    .orderBy("date", "desc")
    .limit(20)
    .get();

  return snap.docs
    .filter((d) => d.data().consultationSummary != null)
    .map((d) => ({
      appointmentId: d.id,
      diagnosis: d.data().consultationSummary.diagnosis,
      clinicalNotes: d.data().consultationSummary.clinicalNotes,
      completedAt: d.data().consultationSummary.completedAt,
    }));
}
