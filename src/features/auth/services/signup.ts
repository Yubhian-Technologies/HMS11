import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "../actions/session";
import { registerPatientProfile } from "@/features/patients/services/patients";
import type { RegisterPatientProfileRequest } from "@hms/shared";

/**
 * FR-1.2 / FR-5.1: the one self-service account creation path in the whole
 * system (docs/07-user-roles.md §7.2). Creates the Firebase Auth account
 * client-side, then calls the authenticated `registerPatientProfile`
 * callable to write the profile and set claims, then forces a token
 * refresh so the session cookie carries the new role immediately.
 */
export async function signup(
  email: string,
  password: string,
  profile: RegisterPatientProfileRequest,
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: profile.name });

  try {
    await registerPatientProfile(profile);
  } catch (err) {
    await credential.user.delete().catch(() => undefined);
    throw err;
  }

  const idTokenResult = await credential.user.getIdTokenResult(true);
  await createSession(idTokenResult.token);
}
