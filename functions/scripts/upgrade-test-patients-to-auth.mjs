// One-off script — NOT a deployed Cloud Function. Upgrades the 10 Firestore-only
// test patients created by seed-reception-test-patients.mjs into real,
// loginable accounts: creates a Firebase Auth user per patient, moves the
// patients/{docId} doc to patients/{authUid} (patient doc id must equal
// the owning Auth uid — see registerPatientProfile.ts), and repoints the
// appointment's patientId at the new uid (firestore.rules' isOwner() checks
// appointment.patientId == request.auth.uid, so this is required for the
// patient to actually see their own appointment).
//
// Usage: node functions/scripts/upgrade-test-patients-to-auth.mjs
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

const TEST_PASSWORD = "TestPatient123!";
const SEEDED_BY = "seed-reception-test-patients";

async function main() {
  const patientsSnap = await db.collection("patients").where("createdBy", "==", SEEDED_BY).get();
  if (patientsSnap.empty) {
    console.error("No Firestore-only test patients found (already upgraded, or seed script wasn't run).");
    process.exit(1);
  }

  const hospitalSnap = await db.collection("hospitals").where("name", "==", "LIFE GOOD HOSPITAL").limit(1).get();
  const hospitalId = hospitalSnap.docs[0].id;
  const branchSnap = await db.collection(`hospitals/${hospitalId}/branches`).limit(1).get();
  const branchId = branchSnap.docs[0].id;
  const apptCollection = db.collection(`hospitals/${hospitalId}/branches/${branchId}/appointments`);

  const created = [];
  let i = 0;
  for (const patientDoc of patientsSnap.docs) {
    i += 1;
    const p = patientDoc.data();
    const email = `testpatient${i}@test.invalid`;

    const user = await auth.createUser({ email, password: TEST_PASSWORD, displayName: p.name });
    await auth.setCustomUserClaims(user.uid, { role: "patient", hospitalId: null, branchId: null });

    const now = FieldValue.serverTimestamp();
    await db
      .collection("patients")
      .doc(user.uid)
      .set({ ...p, userId: user.uid, email, updatedAt: now });
    await db.collection("users").doc(user.uid).set({
      role: "patient",
      name: p.name,
      email,
      phone: p.phone ?? "",
      fcmTokens: [],
      status: "active",
      hospitalId: null,
      branchId: null,
      createdBy: SEEDED_BY,
      createdAt: now,
      updatedAt: now,
    });
    await patientDoc.ref.delete();

    const apptSnap = await apptCollection.where("patientId", "==", patientDoc.id).limit(1).get();
    if (!apptSnap.empty) {
      await apptSnap.docs[0].ref.update({ patientId: user.uid, updatedAt: now });
    }

    created.push({ name: p.name, email, uid: user.uid, appointmentId: apptSnap.docs[0]?.id ?? null });
  }

  console.log(`\nUpgraded ${created.length} test patients to real logins (password: ${TEST_PASSWORD}):`);
  created.forEach((c) => console.log(`  ${c.name.padEnd(20)} ${c.email}  (appt ${c.appointmentId})`));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
