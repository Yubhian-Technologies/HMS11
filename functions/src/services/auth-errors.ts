import { HttpsError } from "firebase-functions/v2/https";
import { getAuth, type CreateRequest, type UserRecord } from "firebase-admin/auth";

/**
 * Every callable that provisions a new staff/doctor/admin account goes
 * through this instead of calling `getAuth().createUser()` directly, so a
 * duplicate email surfaces as a clean 409 the client can show the user,
 * not an unhandled 500 (docs/13-cloud-functions.md §13.4 authorization
 * notes — the same "never leak raw errors" principle applied to Auth
 * provisioning, not just validation).
 */
export async function createAuthUserOrThrow(request: CreateRequest): Promise<UserRecord> {
  try {
    return await getAuth().createUser(request);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account with this email already exists.");
    }
    throw err;
  }
}
