import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
const auth = getAuth();
const db = getFirestore();

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PATIENTS = [
  {
    name: "Amit Sharma",
    email: "cardio.patient1@prasad.com",
    phone: "9876543211",
    age: 48,
    gender: "male",
    vitals: {
      bloodPressure: "140/90",
      pulse: 82,
      temperatureC: 37.0,
      weightKg: 78,
      heightCm: 175,
      bmi: 25.5,
      spo2: 98,
      chiefComplaint: "Chest tightness during morning walk",
      notes: "Hypertension history",
    },
  },
  {
    name: "Sunita Verma",
    email: "cardio.patient2@prasad.com",
    phone: "9876543212",
    age: 52,
    gender: "female",
    vitals: {
      bloodPressure: "135/85",
      pulse: 76,
      temperatureC: 36.8,
      weightKg: 64,
      heightCm: 160,
      bmi: 25.0,
      spo2: 99,
      chiefComplaint: "Palpitations and mild shortness of breath",
      notes: "ECG done at reception",
    },
  },
  {
    name: "Rajesh Kumar",
    email: "cardio.patient3@prasad.com",
    phone: "9876543213",
    age: 61,
    gender: "male",
    vitals: {
      bloodPressure: "150/95",
      pulse: 88,
      temperatureC: 37.1,
      weightKg: 85,
      heightCm: 170,
      bmi: 29.4,
      spo2: 97,
      chiefComplaint: "Shortness of breath on climbing stairs",
      notes: "Elevated BP noted at check-in",
    },
  },
  {
    name: "Pooja Reddy",
    email: "cardio.patient4@prasad.com",
    phone: "9876543214",
    age: 39,
    gender: "female",
    vitals: {
      bloodPressure: "120/80",
      pulse: 72,
      temperatureC: 36.6,
      weightKg: 58,
      heightCm: 165,
      bmi: 21.3,
      spo2: 99,
      chiefComplaint: "Routine cardiac follow-up post angina",
      notes: "Asymptomatic today",
    },
  },
  {
    name: "Vikram Malhotra",
    email: "cardio.patient5@prasad.com",
    phone: "9876543215",
    age: 55,
    gender: "male",
    vitals: {
      bloodPressure: "145/92",
      pulse: 84,
      temperatureC: 36.9,
      weightKg: 80,
      heightCm: 172,
      bmi: 27.0,
      spo2: 98,
      chiefComplaint: "Occasional dizziness and high blood pressure",
      notes: "Family history of CAD",
    },
  },
];

async function getOrCreatePatientAuth(p) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(p.email);
    console.log(`Auth account exists for ${p.email} (UID: ${userRecord.uid})`);
  } catch (e) {
    userRecord = await auth.createUser({
      email: p.email,
      password: "Password@123",
      displayName: p.name,
    });
    console.log(`Created Auth account for ${p.email} (UID: ${userRecord.uid})`);
  }
  return userRecord;
}

async function main() {
  const hospitalId = "UiDKGsWMwc3dBcltWPid"; // PRASAD HOSPITALS
  const branchId = "kTldb5ir4Dnk22iQiGaY"; // Main Branch

  // 1. Find Doctor Rishi or Cardiology Doctor under PRASAD HOSPITALS
  const doctorsSnap = await db
    .collection(`hospitals/${hospitalId}/branches/${branchId}/doctors`)
    .get();

  let targetDoctorId = null;
  let targetDeptId = null;

  for (const dDoc of doctorsSnap.docs) {
    const dData = dDoc.data();
    const uDoc = await db.collection("users").doc(dDoc.id).get();
    const uData = uDoc.data();
    const name = uData?.name ?? "";
    const spec = dData?.specialization ?? "";

    if (name.toLowerCase().includes("rishi") || spec.toLowerCase().includes("cardio")) {
      targetDoctorId = dDoc.id;
      targetDeptId = dData.departmentId;
      console.log(`Found Target Doctor: ${name} (${spec}) - UID: ${targetDoctorId}`);
      break;
    }
  }

  if (!targetDoctorId) {
    // If doctor not found by name, pick the first active doctor in branch
    const firstDoc = doctorsSnap.docs[0];
    if (firstDoc) {
      targetDoctorId = firstDoc.id;
      targetDeptId = firstDoc.data().departmentId;
      console.log(`Using existing doctor UID: ${targetDoctorId}`);
    } else {
      throw new Error("No active doctors found under PRASAD HOSPITALS branch.");
    }
  }

  const today = todayIso();
  const now = FieldValue.serverTimestamp();
  const createdList = [];

  for (let i = 0; i < PATIENTS.length; i++) {
    const p = PATIENTS[i];
    const userRecord = await getOrCreatePatientAuth(p);
    const uid = userRecord.uid;

    // Set claims for patient
    await auth.setCustomUserClaims(uid, { role: "patient" });

    // Set users doc
    await db.collection("users").doc(uid).set(
      {
        role: "patient",
        name: p.name,
        email: p.email,
        phone: p.phone,
        fcmTokens: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    // Set patients doc
    await db.collection("patients").doc(uid).set(
      {
        userId: uid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        dob: "",
        phone: p.phone,
        email: p.email,
        address: { line1: "123 Main St", city: "Hyderabad", state: "Telangana", postalCode: "500001", country: "India" },
        bloodGroup: "O+",
        emergencyContact: { name: "Family Contact", relation: "Spouse", phone: "9876543210" },
        medicalHistory: "Cardiac consultation record",
        currentMedications: "None",
        allergies: "None",
        insurance: null,
        hospitalId,
        branchId,
        status: "active",
        createdBy: "seed-rishi-cardio-patients",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    // Create Appointment in VITALS_COMPLETED status
    const apptRef = db.collection(`hospitals/${hospitalId}/branches/${branchId}/appointments`).doc();
    const session = i % 2 === 0 ? "morning" : "afternoon";

    await apptRef.set({
      patientId: uid,
      patientName: p.name,
      doctorId: targetDoctorId,
      departmentId: targetDeptId ?? null,
      type: "normal",
      priority: i === 0 ? 1 : 0, // Patient 1 priority
      date: today,
      session,
      bookedVia: "online",
      checkIn: {
        token: i + 101,
        checkedInAt: now,
        checkedInBy: "reception",
      },
      vitals: {
        ...p.vitals,
        recordedBy: "reception",
        recordedAt: now,
        sentToDoctorAt: now,
      },
      consultationSummary: null,
      consultDraft: null,
      status: "VITALS_COMPLETED",
      waitingListPosition: null,
      hospitalId,
      branchId,
      createdBy: "seed-rishi-cardio-patients",
      createdAt: now,
      updatedAt: now,
    });

    createdList.push({
      email: p.email,
      password: "Password@123",
      name: p.name,
      appointmentId: apptRef.id,
      token: i + 101,
      bp: p.vitals.bloodPressure,
      complaint: p.vitals.chiefComplaint,
    });
  }

  console.log("\n=======================================================");
  console.log(" SUCCESSFULLY INJECTED 5 PATIENTS INTO DOCTOR QUEUE ");
  console.log("=======================================================\n");
  console.log(`Doctor UID: ${targetDoctorId}`);
  console.log(`Hospital ID: ${hospitalId} (PRASAD HOSPITALS)`);
  console.log(`Date: ${today}\n`);
  console.log("Patient Credentials & Vitals Summary:");
  createdList.forEach((c, idx) => {
    console.log(`\n${idx + 1}. ${c.name}`);
    console.log(`   Email:    ${c.email}`);
    console.log(`   Password: ${c.password}`);
    console.log(`   Token #:  ${c.token}`);
    console.log(`   Vitals:   BP ${c.bp} | Complaint: "${c.complaint}"`);
  });
  console.log("\n=======================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
