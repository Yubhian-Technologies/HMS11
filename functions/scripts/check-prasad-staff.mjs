import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
const auth = getAuth();
const db = getFirestore();

async function main() {
  const hospitalId = "UiDKGsWMwc3dBcltWPid";
  const branchId = "kTldb5ir4Dnk22iQiGaY";

  const snap = await db.collection("users").where("hospitalId", "==", hospitalId).get();
  console.log(`\nStaff Users under PRASAD HOSPITALS (${hospitalId}):`);
  snap.docs.forEach((d) => {
    const u = d.data();
    console.log(`  Name: ${u.name} | Role: ${u.role} | Email: ${u.email} | BranchId: ${u.branchId}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
