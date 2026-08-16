// One-off administrative script — NOT a deployed Cloud Function. Seeds one
// demo hospital with enough data (staff of every role, including Nurse,
// departments, an approved doctor slot, and a patient already checked in)
// that every role's dashboard has something to show immediately after
// running `seed:super-admin` — see docs/10-collections-schema.md "Migration
// Status" / CLAUDE.md changelog for why this exists.
//
// Usage against the Firebase emulators (recommended for local verification —
// no real service-account credentials needed, the Admin SDK talks to the
// emulator hosts instead):
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//   GCLOUD_PROJECT=demo-project node functions/scripts/seed-demo-data.mjs
//
// Usage against a real Firebase project:
//   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
//   node functions/scripts/seed-demo-data.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Local calendar day, NOT UTC — must match apps/web/src/lib/rolling-window.ts's
// todayIsoClient(), since every "today" query in the app (nurse queue, office
// slots, daily schedule) filters by this same local-day string. Using
// `new Date().toISOString().slice(0, 10)` here would silently seed data under
// the wrong date whenever the local timezone is ahead of UTC (e.g. IST),
// making seeded "today" data invisible until UTC catches up.
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (usingEmulator) {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-project" });
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars " +
        "(or set FIRESTORE_EMULATOR_HOST to seed against the local emulators instead).",
    );
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const auth = getAuth();
const db = getFirestore();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Password123!";

async function upsertAuthUser(email, name) {
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch {
    return auth.createUser({ email, password: DEMO_PASSWORD, displayName: name });
  }
}

async function createStaff({ email, name, role, hospitalId, branchId }) {
  const user = await upsertAuthUser(email, name);
  await db
    .collection("users")
    .doc(user.uid)
    .set(
      {
        role,
        name,
        email,
        phone: "9999999999",
        fcmTokens: [],
        status: "active",
        hospitalId,
        branchId,
        createdBy: "seed-demo-data",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  await auth.setCustomUserClaims(user.uid, { role, hospitalId, branchId });
  return user.uid;
}

function branchCollection(hospitalId, branchId, collection) {
  return `hospitals/${hospitalId}/branches/${branchId}/${collection}`;
}

async function main() {
  const now = FieldValue.serverTimestamp();

  // --- Hospital + Branch --------------------------------------------------
  const hospitalRef = db.collection("hospitals").doc();
  const hospitalId = hospitalRef.id;
  const branchRef = hospitalRef.collection("branches").doc();
  const branchId = branchRef.id;

  await hospitalRef.set({
    name: "City General Hospital (Demo)",
    registrationNumber: "DEMO-0001",
    contactEmail: "contact@citygeneral.demo",
    contactPhone: "9000000000",
    address: { line1: "1 Health St", city: "Metropolis", state: "State", postalCode: "000000", country: "IN" },
    adminUserId: null,
    hospitalId,
    branchId: null,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });

  await branchRef.set({
    name: "Main Branch",
    address: { line1: "1 Health St", city: "Metropolis", state: "State", postalCode: "000000", country: "IN" },
    contactPhone: "9000000001",
    timings: [],
    hospitalId,
    branchId: null,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Hospital: ${hospitalId}  Branch: ${branchId}`);

  // --- Departments (hospital-scoped, not branch-scoped) -------------------
  const deptGeneralRef = hospitalRef.collection("departments").doc();
  const deptCardioRef = hospitalRef.collection("departments").doc();
  await deptGeneralRef.set({
    name: "General Medicine",
    hospitalId,
    branchId: null,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });
  await deptCardioRef.set({
    name: "Cardiology",
    hospitalId,
    branchId: null,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });

  // --- Staff ----------------------------------------------------------------
  const adminUid = await createStaff({
    email: "admin@citygeneral.demo",
    name: "Ava Admin",
    role: "admin",
    hospitalId,
    branchId,
  });
  await hospitalRef.update({ adminUserId: adminUid });

  const officeUid = await createStaff({
    email: "office@citygeneral.demo",
    name: "Oscar Office",
    role: "office",
    hospitalId,
    branchId,
  });
  await createStaff({
    email: "reception@citygeneral.demo",
    name: "Rita Reception",
    role: "reception",
    hospitalId,
    branchId,
  });
  const nurseUid = await createStaff({
    email: "nurse@citygeneral.demo",
    name: "Nora Nurse",
    role: "nurse",
    hospitalId,
    branchId,
  });
  const pharmacyUid = await createStaff({
    email: "pharmacy@citygeneral.demo",
    name: "Percy Pharmacist",
    role: "pharmacy",
    hospitalId,
    branchId,
  });
  const labUid = await createStaff({
    email: "lab@citygeneral.demo",
    name: "Layla Lab",
    role: "lab",
    hospitalId,
    branchId,
  });

  // --- Doctors (branch-scoped `doctors/{uid}` extension of `users/{uid}`) --
  async function createDoctor({ email, name, departmentId, specialization, consultationFee }) {
    const uid = await createStaff({ email, name, role: "doctor", hospitalId, branchId });
    await db.doc(`${branchCollection(hospitalId, branchId, "doctors")}/${uid}`).set({
      departmentId,
      specialization,
      qualifications: ["MBBS"],
      consultationFee,
      hospitalId,
      branchId,
      status: "active",
      createdBy: "seed-demo-data",
      createdAt: now,
      updatedAt: now,
    });
    return uid;
  }

  const doctor1Uid = await createDoctor({
    email: "doctor.general@citygeneral.demo",
    name: "Dr. Priya Sharma",
    departmentId: deptGeneralRef.id,
    specialization: "General Physician",
    consultationFee: 300,
  });
  const doctor2Uid = await createDoctor({
    email: "doctor.cardio@citygeneral.demo",
    name: "Dr. Arjun Rao",
    departmentId: deptCardioRef.id,
    specialization: "Cardiologist",
    consultationFee: 500,
  });

  // Today's approved slot for doctor 1, so booking/check-in has something to work with.
  const today = todayIso();
  const slotRef = db.doc(
    `${branchCollection(hospitalId, branchId, "doctors")}/${doctor1Uid}/slots/${today}_morning`,
  );
  await slotRef.set({
    date: today,
    session: "morning",
    totalCount: 20,
    walkInReserved: 5,
    checkInCutoffMinutes: 15,
    onlineBookedCount: 0,
    walkInBookedCount: 0,
    status: "approved",
    hospitalId,
    branchId,
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });

  // --- Wards / Rooms / Beds --------------------------------------------------
  const wardRef = db.collection(branchCollection(hospitalId, branchId, "wards")).doc();
  await wardRef.set({
    name: "General Ward",
    type: "general",
    hospitalId,
    branchId,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });
  const roomRef = db.collection(branchCollection(hospitalId, branchId, "rooms")).doc();
  await roomRef.set({
    wardId: wardRef.id,
    roomNumber: "101",
    dailyRate: 1000,
    hospitalId,
    branchId,
    status: "active",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });
  await db.collection(branchCollection(hospitalId, branchId, "beds")).doc().set({
    roomId: roomRef.id,
    wardId: wardRef.id,
    bedNumber: "101-A",
    hospitalId,
    branchId,
    status: "available",
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });

  // --- Patient + appointment already CHECKED_IN (nurse queue isn't empty) --
  const patientEmail = "patient.demo@citygeneral.demo";
  const patientAuth = await upsertAuthUser(patientEmail, "Priya Patient");
  const patientRef = db.collection("patients").doc(patientAuth.uid);
  await patientRef.set(
    {
      userId: patientAuth.uid,
      name: "Priya Patient",
      age: 34,
      gender: "female",
      dob: "1991-04-02",
      phone: "9123456789",
      email: patientEmail,
      address: { line1: "22 Park Ave", city: "Metropolis", state: "State", postalCode: "000000", country: "IN" },
      bloodGroup: "O+",
      emergencyContact: { name: "Rahul Patient", relation: "Spouse", phone: "9123456780" },
      medicalHistory: "None recorded",
      currentMedications: "None",
      allergies: "Penicillin",
      hospitalId: null,
      branchId: null,
      status: "active",
      createdBy: "seed-demo-data",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  await auth.setCustomUserClaims(patientAuth.uid, { role: "patient", hospitalId: null, branchId: null });

  const apptRef = db.collection(branchCollection(hospitalId, branchId, "appointments")).doc();
  await apptRef.set({
    patientId: patientAuth.uid,
    patientName: "Priya Patient",
    doctorId: doctor1Uid,
    departmentId: deptGeneralRef.id,
    type: "normal",
    priority: 0,
    date: today,
    session: "morning",
    bookedVia: "online",
    status: "CHECKED_IN",
    checkIn: { checkedInAt: now, checkedInBy: officeUid, token: "001" },
    vitals: null,
    consultationSummary: null,
    consultDraft: null,
    waitingListPosition: null,
    hospitalId,
    branchId,
    createdBy: "seed-demo-data",
    createdAt: now,
    updatedAt: now,
  });

  console.log("\nSeed complete. Demo accounts (password: " + DEMO_PASSWORD + "):");
  console.log(`  super_admin  — run seed:super-admin separately`);
  console.log(`  admin        — admin@citygeneral.demo`);
  console.log(`  office       — office@citygeneral.demo`);
  console.log(`  reception    — reception@citygeneral.demo`);
  console.log(`  nurse        — nurse@citygeneral.demo`);
  console.log(`  doctor       — doctor.general@citygeneral.demo (has the checked-in patient)`);
  console.log(`  doctor       — doctor.cardio@citygeneral.demo`);
  console.log(`  pharmacy     — pharmacy@citygeneral.demo`);
  console.log(`  lab          — lab@citygeneral.demo`);
  console.log(`  patient      — patient.demo@citygeneral.demo`);
  console.log(`\nhospitalId=${hospitalId} branchId=${branchId} appointmentId=${apptRef.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
