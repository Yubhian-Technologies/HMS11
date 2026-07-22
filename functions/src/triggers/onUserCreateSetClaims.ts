import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";

/**
 * FR-1.3: every session resolves to exactly one role + hospitalId + branchId
 * (super_admin/patient carry null for the tenant claims — see
 * docs/07-user-roles.md §7.1). Custom claims are the source of truth read by
 * apps/web's requireRole() and by Firestore Security Rules; this trigger is
 * what keeps them in sync with the users/{uid} document whenever a new
 * account is provisioned.
 */
export const onUserCreateSetClaims = onDocumentCreated("users/{uid}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const user = snapshot.data() as {
    role: string;
    hospitalId: string | null;
    branchId: string | null;
  };

  await getAuth().setCustomUserClaims(event.params.uid, {
    role: user.role,
    hospitalId: user.hospitalId ?? null,
    branchId: user.branchId ?? null,
  });
});
