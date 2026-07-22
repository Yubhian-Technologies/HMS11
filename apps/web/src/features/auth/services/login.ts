import { signInWithEmailAndPassword } from "firebase/auth";
import { LoginRequest, type Role } from "@hms/shared";
import { auth } from "@/lib/firebase/client";
import { createSession } from "../actions/session";

/**
 * Client-side sign-in: authenticates against Firebase Auth, then exchanges
 * the resulting ID token for a server-verifiable session cookie (server
 * action) so subsequent navigation is gated by requireRole() without needing
 * the client SDK on every request.
 */
export async function login(input: unknown): Promise<{ role: Role }> {
  const { email, password } = LoginRequest.parse(input);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idTokenResult = await credential.user.getIdTokenResult(true);
  const role = idTokenResult.claims.role as Role | undefined;

  if (!role) {
    throw new Error(
      "No role assigned to this account yet. Contact your administrator.",
    );
  }

  await createSession(idTokenResult.token);
  return { role };
}
