import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type {
  Appointment,
  Vitals,
  Consultation,
  Prescription,
  LabReport,
  Admission,
  FollowUp,
} from "@hms/shared";

export interface TimelineEntry {
  id: string;
  type:
    | "appointment"
    | "vitals"
    | "consultation"
    | "prescription"
    | "labReport"
    | "admission"
    | "discharge"
    | "followUp";
  date: string;
  title: string;
  description: string;
}

function toDateString(ts: { toDate(): Date }): string {
  return ts.toDate().toISOString().slice(0, 10);
}

/**
 * FR-13.1. The patient's own cross-hospital view — no hospitalId filter,
 * unlike the doctor's consultation-time history (Module 9), which is
 * deliberately scoped to one hospital. A patient's own data follows them
 * everywhere (docs/07-user-roles.md §7.1 ownership scope).
 */
export async function getPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
  const db = getAdminDb();

  const [apptSnap, vitalsSnap, consultSnap, presSnap, reportSnap, admSnap, followSnap] = await Promise.all([
    db.collection("appointments").where("patientId", "==", patientId).get(),
    db.collection("vitals").where("patientId", "==", patientId).get(),
    db.collection("consultations").where("patientId", "==", patientId).get(),
    db.collection("prescriptions").where("patientId", "==", patientId).get(),
    db.collection("labReports").where("patientId", "==", patientId).get(),
    db.collection("admissions").where("patientId", "==", patientId).get(),
    db.collection("followUps").where("patientId", "==", patientId).get(),
  ]);

  const entries: TimelineEntry[] = [];

  apptSnap.docs.forEach((doc) => {
    const a = doc.data() as Appointment;
    entries.push({
      id: doc.id,
      type: "appointment",
      date: a.date,
      title: a.type === "emergency" ? "Emergency visit" : "Appointment",
      description: `${a.status}${a.startTime ? ` · ${a.startTime}` : ""}`,
    });
  });

  vitalsSnap.docs.forEach((doc) => {
    const v = doc.data() as Vitals;
    entries.push({
      id: doc.id,
      type: "vitals",
      date: toDateString(v.createdAt),
      title: "Vitals recorded",
      description: `BP ${v.bloodPressure} · Pulse ${v.pulse} · Temp ${v.temperatureC}°C · BMI ${v.bmi}`,
    });
  });

  consultSnap.docs.forEach((doc) => {
    const c = doc.data() as Consultation;
    entries.push({
      id: doc.id,
      type: "consultation",
      date: toDateString(c.createdAt),
      title: `Diagnosis: ${c.diagnosis}`,
      description: c.clinicalNotes,
    });
  });

  presSnap.docs.forEach((doc) => {
    const p = doc.data() as Prescription;
    entries.push({
      id: doc.id,
      type: "prescription",
      date: toDateString(p.createdAt),
      title: "Prescription issued",
      description: p.items.map((i) => i.medicineName).join(", "),
    });
  });

  reportSnap.docs.forEach((doc) => {
    const r = doc.data() as LabReport;
    entries.push({
      id: doc.id,
      type: "labReport",
      date: toDateString(r.createdAt),
      title: "Lab report uploaded",
      description: r.summaryNotes ?? "",
    });
  });

  admSnap.docs.forEach((doc) => {
    const a = doc.data() as Admission;
    entries.push({
      id: doc.id,
      type: "admission",
      date: toDateString(a.admittedAt),
      title: "Admitted",
      description: `Bed ${a.bedId}`,
    });
    if (a.dischargeSummary && a.dischargedAt) {
      entries.push({
        id: `${doc.id}-discharge`,
        type: "discharge",
        date: toDateString(a.dischargedAt),
        title: "Discharged",
        description: `${a.dischargeSummary.conditionAtDischarge} — ${a.dischargeSummary.followUpInstructions}`,
      });
    }
  });

  followSnap.docs.forEach((doc) => {
    const f = doc.data() as FollowUp;
    entries.push({
      id: doc.id,
      type: "followUp",
      date: f.scheduledDate,
      title: "Follow-up scheduled",
      description: f.resultingAppointmentId ? "Booked" : "Not yet booked",
    });
  });

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
