import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  const hospitalId = "UiDKGsWMwc3dBcltWPid";
  const branchId = "kTldb5ir4Dnk22iQiGaY";

  const snap = await db.collection(`hospitals/${hospitalId}/branches/${branchId}/appointments`).get();
  console.log(`\nFound ${snap.size} appointments under PRASAD HOSPITALS Main Branch:`);
  snap.docs.forEach((d) => {
    const a = d.data();
    console.log(`  ID: ${d.id} | Date: ${a.date} | Status: ${a.status} | Patient: ${a.patientName} | DoctorId: ${a.doctorId}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
