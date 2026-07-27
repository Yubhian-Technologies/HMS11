import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

interface HospitalDoc {
  status: string;
}

/**
 * FR-2.6: disabling a hospital must block login for all its staff, the same
 * way onUserStatusChange blocks a single disabled user (FR-1.4) — by
 * revoking refresh tokens so apps/web's requireRole() (verifySessionCookie
 * with checkRevoked=true) rejects on each staff member's very next request.
 * Patients are never touched here: FR-2.6 only blocks *staff* login, and
 * patient accounts aren't hospital-scoped (docs/07-user-roles.md §7.1) —
 * only Admin/Office/Reception/Doctor/Pharmacy/Lab carry a hospitalId claim.
 */
export const onHospitalStatusChange = onDocumentUpdated("hospitals/{hospitalId}", async (event) => {
  const before = event.data?.before.data() as HospitalDoc | undefined;
  const after = event.data?.after.data() as HospitalDoc | undefined;
  if (!before || !after) return;
  if (before.status === "disabled" || after.status !== "disabled") return;

  const hospitalId = event.params.hospitalId;
  const db = getFirestore();
  const staffSnap = await db.collection("users").where("hospitalId", "==", hospitalId).get();
  if (staffSnap.empty) return;

  const auth = getAuth();
  await Promise.all(staffSnap.docs.map((doc) => auth.revokeRefreshTokens(doc.id)));
});
