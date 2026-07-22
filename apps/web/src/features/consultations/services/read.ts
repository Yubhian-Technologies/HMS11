import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { Consultation, Prescription, LabOrder, Admission, MedicalCertificate, Referral } from "@hms/shared";

export type ConsultationRecord = Consultation & { id: string };
export type PrescriptionRecord = Prescription & { id: string };
export type LabOrderRecord = LabOrder & { id: string };
export type AdmissionRecord = Admission & { id: string };
export type CertificateRecord = MedicalCertificate & { id: string };
export type ReferralRecord = Referral & { id: string };

export interface PatientHistory {
  consultations: ConsultationRecord[];
  prescriptions: PrescriptionRecord[];
  labOrders: LabOrderRecord[];
  admissions: AdmissionRecord[];
}

/**
 * Scoped to this hospital only — a doctor sees history within their own
 * hospital (docs/firestore.rules "Module 9" comment); cross-hospital
 * clinical record sharing is out of scope (see docs/02-missing-features.md).
 */
export async function getPatientHistory(patientId: string, hospitalId: string): Promise<PatientHistory> {
  const db = getAdminDb();
  const [consultSnap, presSnap, labSnap, admSnap] = await Promise.all([
    db
      .collection("consultations")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collection("prescriptions")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collection("labOrders")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
    db
      .collection("admissions")
      .where("patientId", "==", patientId)
      .where("hospitalId", "==", hospitalId)
      .orderBy("createdAt", "desc")
      .get(),
  ]);

  return {
    consultations: consultSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Consultation) })),
    prescriptions: presSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Prescription) })),
    labOrders: labSnap.docs.map((d) => ({ id: d.id, ...(d.data() as LabOrder) })),
    admissions: admSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Admission) })),
  };
}
