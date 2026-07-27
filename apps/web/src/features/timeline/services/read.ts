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
  MedicineLog,
  HealthUpdate,
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
    | "followUp"
    | "medicineLog"
    | "healthUpdate";
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

  const [apptSnap, vitalsSnap, consultSnap, presSnap, reportSnap, admSnap, followSnap, medLogSnap, healthSnap] =
    await Promise.all([
      db.collection("appointments").where("patientId", "==", patientId).get(),
      db.collection("vitals").where("patientId", "==", patientId).get(),
      db.collection("consultations").where("patientId", "==", patientId).get(),
      db.collection("prescriptions").where("patientId", "==", patientId).get(),
      db.collection("labReports").where("patientId", "==", patientId).get(),
      db.collection("admissions").where("patientId", "==", patientId).get(),
      db.collection("followUps").where("patientId", "==", patientId).get(),
      db.collection("medicineLogs").where("patientId", "==", patientId).get(),
      db.collection("healthUpdates").where("patientId", "==", patientId).get(),
    ]);

  const entries: TimelineEntry[] = [];

  apptSnap.docs.forEach((doc) => {
    const a = doc.data() as Appointment;
    entries.push({
      id: doc.id,
      type: "appointment",
      date: a.date,
      title: a.type === "emergency" ? "Emergency visit" : "Appointment",
      description: `${a.status}${a.session ? ` · ${a.session}` : ""}`,
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
    // Skip requests still awaiting a bed (FR-9.9 add-on) — nothing has
    // actually happened yet from the patient's perspective until Office
    // assigns one and admittedAt/bedId are set.
    if (a.admittedAt && a.bedId) {
      entries.push({
        id: doc.id,
        type: "admission",
        date: toDateString(a.admittedAt),
        title: "Admitted",
        description: `Bed ${a.bedId}`,
      });
    }
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

  // FR-13.1/FR-14.3 — medicine compliance. Only entries where something has
  // actually happened (patient acted); "pending" doses haven't occurred yet
  // from the patient's history perspective, same reasoning as the
  // pendingBedAssignment skip above.
  medLogSnap.docs.forEach((doc) => {
    const m = doc.data() as MedicineLog;
    if (m.patientStatus === "pending") return;
    entries.push({
      id: doc.id,
      type: "medicineLog",
      date: toDateString(m.updatedAt),
      title: `Dose ${m.patientStatus}`,
      description: toDateString(m.scheduledAt) === toDateString(m.updatedAt) ? "" : `Scheduled ${toDateString(m.scheduledAt)}`,
    });
  });

  healthSnap.docs.forEach((doc) => {
    const h = doc.data() as HealthUpdate;
    const parts = [`Condition: ${h.condition}`, `Pain ${h.painLevel}/10`];
    if (h.bloodPressure) parts.push(`BP ${h.bloodPressure}`);
    if (h.sugarMgDl != null) parts.push(`Sugar ${h.sugarMgDl}`);
    if (h.temperatureC != null) parts.push(`Temp ${h.temperatureC}°C`);
    if (h.weightKg != null) parts.push(`Weight ${h.weightKg}kg`);
    entries.push({
      id: doc.id,
      type: "healthUpdate",
      date: toDateString(h.createdAt),
      title: "Recovery update",
      description: parts.join(" · "),
    });
  });

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
