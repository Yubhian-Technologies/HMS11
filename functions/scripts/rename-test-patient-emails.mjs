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
if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();
const db = getFirestore();

const RENAME_MAP = [
  { oldEmail: "cardio.patient1@prasad.com", newEmail: "patient1@gmail.com", name: "Amit Sharma" },
  { oldEmail: "cardio.patient2@prasad.com", newEmail: "patient2@gmail.com", name: "Sunita Verma" },
  { oldEmail: "cardio.patient3@prasad.com", newEmail: "patient3@gmail.com", name: "Rajesh Kumar" },
  { oldEmail: "cardio.patient4@prasad.com", newEmail: "patient4@gmail.com", name: "Pooja Reddy" },
  { oldEmail: "cardio.patient5@prasad.com", newEmail: "patient5@gmail.com", name: "Vikram Malhotra" },
];

async function main() {
  console.log("Renaming patient emails in Firebase Auth and Firestore...\n");

  for (const item of RENAME_MAP) {
    try {
      // 1. Get existing auth user
      const userRecord = await auth.getUserByEmail(item.oldEmail);
      const uid = userRecord.uid;

      // Check if new email already exists, if so delete old or handle
      try {
        const existingNew = await auth.getUserByEmail(item.newEmail);
        if (existingNew && existingNew.uid !== uid) {
          console.log(`New email ${item.newEmail} already exists (UID: ${existingNew.uid}), deleting duplicate...`);
          await auth.deleteUser(existingNew.uid);
        }
      } catch (e) {
        // new email doesn't exist, which is expected
      }

      // 2. Update Auth email
      await auth.updateUser(uid, { email: item.newEmail });
      console.log(`Updated Auth: ${item.oldEmail} -> ${item.newEmail} (UID: ${uid})`);

      // 3. Update Firestore users doc
      await db.collection("users").doc(uid).set(
        { email: item.newEmail },
        { merge: true }
      );

      // 4. Update Firestore patients doc
      await db.collection("patients").doc(uid).set(
        { email: item.newEmail },
        { merge: true }
      );

      console.log(`Updated Firestore: ${item.name} (${item.newEmail})`);
    } catch (err) {
      console.error(`Failed to update ${item.oldEmail}:`, err.message);
    }
  }

  console.log("\n=======================================================");
  console.log(" SUCCESSFULLY RENAMED PATIENT EMAILS TO GMAIL FORMAT ");
  console.log("=======================================================\n");
  RENAME_MAP.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name}`);
    console.log(`   Email:    ${item.newEmail}`);
    console.log(`   Password: Password@123\n`);
  });
  console.log("=======================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
