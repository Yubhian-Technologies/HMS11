import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";

interface UserDoc {
  role: string;
  hospitalId: string | null;
  branchId: string | null;
  status: string;
}

/**
 * FR-1.4: a disabled user cannot authenticate, even mid-session. Revoking
 * refresh tokens forces apps/web's requireRole() (verifySessionCookie with
 * checkRevoked=true) to reject on the user's very next request.
 *
 * Also keeps custom claims in sync if an already-active user's role or
 * hospital/branch assignment changes after creation (e.g. Admin moves a
 * staff member to a different branch).
 */
export const onUserStatusChange = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data?.before.data() as UserDoc | undefined;
  const after = event.data?.after.data() as UserDoc | undefined;
  if (!before || !after) return;

  if (before.status !== "disabled" && after.status === "disabled") {
    await getAuth().revokeRefreshTokens(event.params.uid);
  }

  if (
    before.role !== after.role ||
    before.hospitalId !== after.hospitalId ||
    before.branchId !== after.branchId
  ) {
    await getAuth().setCustomUserClaims(event.params.uid, {
      role: after.role,
      hospitalId: after.hospitalId ?? null,
      branchId: after.branchId ?? null,
    });
  }
});
