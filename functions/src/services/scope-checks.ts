import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import type { CallerContext } from "./callable-auth";

/** Admin (and other hospital-scoped roles) can only ever act within their own hospital. */
export function assertOwnHospital(caller: CallerContext, hospitalId: string): void {
  if (caller.hospitalId !== hospitalId) {
    throw new HttpsError("permission-denied", "You can only manage your own hospital.");
  }
}

export async function assertBranchExists(
  db: Firestore,
  hospitalId: string,
  branchId: string,
): Promise<void> {
  const snap = await db.collection(`hospitals/${hospitalId}/branches`).doc(branchId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }
}
