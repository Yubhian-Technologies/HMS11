// One-off administrative script — NOT a deployed Cloud Function. Creates the
// platform's first super_admin account, since super_admin is deliberately
// never provisionable from the app itself (docs/07-user-roles.md §7.2: "seeded
// manually, not via in-app UI").
//
// Usage:
//   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
//   SEED_SUPER_ADMIN_EMAIL=you@example.com SEED_SUPER_ADMIN_PASSWORD=... \
//   node functions/scripts/seed-super-admin.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const email = process.env.SEED_SUPER_ADMIN_EMAIL;
const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
const name = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars.",
  );
  process.exit(1);
}
if (!email || !password) {
  console.error(
    "Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD env vars before running.",
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Auth user already exists: ${userRecord.uid}`);
  } catch {
    userRecord = await auth.createUser({ email, password, displayName: name });
    console.log(`Created auth user: ${userRecord.uid}`);
  }

  await db
    .collection("users")
    .doc(userRecord.uid)
    .set(
      {
        role: "super_admin",
        name,
        email,
        phone: "",
        fcmTokens: [],
        status: "active",
        hospitalId: null,
        branchId: null,
        createdBy: userRecord.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

  // Set claims directly rather than relying solely on the
  // onUserCreateSetClaims trigger, so seeding works even before functions
  // are deployed/emulated.
  await auth.setCustomUserClaims(userRecord.uid, {
    role: "super_admin",
    hospitalId: null,
    branchId: null,
  });

  console.log(`Seeded users/${userRecord.uid} with role=super_admin and set custom claims.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
