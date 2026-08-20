// One-off script — NOT a deployed Cloud Function. Injects 10 test patients
// with BOOKED appointments (today, spread across whatever approved doctor
// slots currently exist) into the live LIFE GOOD HOSPITAL branch, so
// Reception's queue has real check-in-ready entries to test against.
// Firestore-only — no Firebase Auth accounts created (nothing here needs a
// login, per user request).
//
// Usage (reads Admin SDK creds from functions/.env.local via dotenv, same
// vars as the Next.js app's own FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY):
//   node functions/scripts/seed-reception-test-patients.mjs
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function loadEnvLocal() {
  const path = new URL("../../.env.local", import.meta.url);
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}
loadEnvLocal();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TEST_PATIENTS = [
  { name: "Test Patient One", age: 29, gender: "male", phone: "9800000001" },
  { name: "Test Patient Two", age: 34, gender: "female", phone: "9800000002" },
  { name: "Test Patient Three", age: 41, gender: "male", phone: "9800000003" },
  { name: "Test Patient Four", age: 26, gender: "female", phone: "9800000004" },
  { name: "Test Patient Five", age: 55, gender: "male", phone: "9800000005" },
  { name: "Test Patient Six", age: 38, gender: "female", phone: "9800000006" },
  { name: "Test Patient Seven", age: 47, gender: "male", phone: "9800000007" },
  { name: "Test Patient Eight", age: 31, gender: "female", phone: "9800000008" },
  { name: "Test Patient Nine", age: 62, gender: "male", phone: "9800000009" },
  { name: "Test Patient Ten", age: 24, gender: "female", phone: "9800000010" },
];

async function main() {
  const hospitalSnap = await db.collection("hospitals").where("name", "==", "LIFE GOOD HOSPITAL").limit(1).get();
  if (hospitalSnap.empty) throw new Error("LIFE GOOD HOSPITAL not found.");
  const hospitalId = hospitalSnap.docs[0].id;

  const branchSnap = await db.collection(`hospitals/${hospitalId}/branches`).limit(1).get();
  if (branchSnap.empty) throw new Error("No branch found under LIFE GOOD HOSPITAL.");
  const branchId = branchSnap.docs[0].id;

  const today = todayIso();

  // Avoid a collection-group query (would need a new composite index in
  // prod) — instead walk each active doctor's two known slot-doc ids for
  // today directly, same lookup shape bookAppointment itself uses.
  const doctorsSnap = await db
    .collection(`hospitals/${hospitalId}/branches/${branchId}/doctors`)
    .where("status", "==", "active")
    .get();
  if (doctorsSnap.empty) throw new Error("No active doctors found under this branch.");

  const slotLookups = doctorsSnap.docs.flatMap((doc) =>
    ["morning", "afternoon"].map((session) => ({
      doctorId: doc.id,
      departmentId: doc.data().departmentId ?? null,
      session,
      ref: db.doc(`hospitals/${hospitalId}/branches/${branchId}/doctors/${doc.id}/slots/${today}_${session}`),
    })),
  );
  const slotSnaps = await Promise.all(slotLookups.map((s) => s.ref.get()));

  // Mirrors bookAppointment's own walk-in-first-then-online bucket logic
  // (these are walk-in-style test bookings, same as Reception's own path).
  const slots = slotLookups
    .map((s, i) => ({ ...s, pool: slotSnaps[i].data() }))
    .filter((s) => s.pool && s.pool.status === "approved")
    .map((s) => ({
      ref: s.ref,
      doctorId: s.doctorId,
      departmentId: s.departmentId,
      session: s.session,
      walkInRemaining: Math.max(0, s.pool.walkInReserved - s.pool.walkInBookedCount),
      onlineRemaining: Math.max(0, s.pool.totalCount - s.pool.walkInReserved - s.pool.onlineBookedCount),
    }));
  if (slots.length === 0) throw new Error(`No approved doctor slots for ${today} at this branch — nothing to book into.`);

  const now = FieldValue.serverTimestamp();
  const created = [];

  for (let i = 0; i < TEST_PATIENTS.length; i++) {
    const p = TEST_PATIENTS[i];
    const slot = slots.find((s) => s.walkInRemaining > 0 || s.onlineRemaining > 0);
    if (!slot) {
      console.warn(`Only ${created.length} appointments booked — every approved slot today is at capacity.`);
      break;
    }
    const bucket = slot.walkInRemaining > 0 ? "walkin" : "online";
    if (bucket === "walkin") slot.walkInRemaining -= 1;
    else slot.onlineRemaining -= 1;

    const patientRef = db.collection("patients").doc();
    await patientRef.set({
      userId: patientRef.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      dob: "",
      phone: p.phone,
      email: `${patientRef.id}@test.invalid`,
      address: { line1: "", city: "", state: "", postalCode: "", country: "" },
      bloodGroup: "",
      emergencyContact: { name: "", relation: "", phone: "" },
      medicalHistory: "",
      currentMedications: "",
      allergies: "",
      insurance: null,
      hospitalId: null,
      branchId: null,
      status: "active",
      createdBy: "seed-reception-test-patients",
      createdAt: now,
      updatedAt: now,
    });

    const apptRef = db.collection(`hospitals/${hospitalId}/branches/${branchId}/appointments`).doc();
    await apptRef.set({
      patientId: patientRef.id,
      patientName: p.name,
      doctorId: slot.doctorId,
      departmentId: slot.departmentId,
      type: "normal",
      priority: 0,
      date: today,
      session: slot.session,
      bookedVia: bucket,
      checkIn: null,
      vitals: null,
      consultationSummary: null,
      consultDraft: null,
      status: "BOOKED",
      waitingListPosition: null,
      hospitalId,
      branchId,
      createdBy: "seed-reception-test-patients",
      createdAt: now,
      updatedAt: now,
    });
    await slot.ref.update({
      [bucket === "walkin" ? "walkInBookedCount" : "onlineBookedCount"]: FieldValue.increment(1),
      updatedAt: now,
    });

    created.push({ patientId: patientRef.id, appointmentId: apptRef.id, name: p.name, session: slot.session, bucket });
  }

  console.log(`\nCreated ${created.length} BOOKED appointments at hospitalId=${hospitalId} branchId=${branchId}, date=${today}:`);
  created.forEach((c) => console.log(`  ${c.name} — appt ${c.appointmentId} (${c.session})`));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
