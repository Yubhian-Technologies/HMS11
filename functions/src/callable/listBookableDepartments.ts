import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ListBookableDepartmentsResponse, doctorCollection, type DoctorSlot } from "@hms/shared";
import { requireCallerRole } from "../services/callable-auth";
import { addDays, todayIso } from "../services/datetime";

const WINDOW_DAYS = 3;
const GENERAL_DEPARTMENT_NAME = "general medicine";

/**
 * Patient-facing, platform-wide department directory for booking — see
 * ListBookableDepartmentsResponse's doc comment for why this exists and why
 * it's doctor-anonymous. Scans every branch's `departmentReleases` for
 * `publiclyBookable: true`, then for each released department sums approved-
 * slot online capacity across every doctor in that department for the
 * rolling 3-day window.
 */
export const listBookableDepartments = onCall(async (request) => {
  requireCallerRole(request, ["patient"]);

  const db = getFirestore();
  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(todayIso(), i));

  const releasesSnap = await db
    .collectionGroup("departmentReleases")
    .where("publiclyBookable", "==", true)
    .get();

  const departments = await Promise.all(
    releasesSnap.docs.map(async (releaseDoc) => {
      // hospitals/{h}/branches/{b}/departmentReleases/{departmentId}
      const pathSegments = releaseDoc.ref.path.split("/");
      const hospitalId = pathSegments[1]!;
      const branchId = pathSegments[3]!;
      const departmentId = releaseDoc.id;

      const [deptSnap, doctorsSnap] = await Promise.all([
        db.doc(`hospitals/${hospitalId}/departments/${departmentId}`).get(),
        db
          .collection(`hospitals/${hospitalId}/branches/${branchId}/doctors`)
          .where("departmentId", "==", departmentId)
          .where("status", "==", "active")
          .get(),
      ]);
      if (!deptSnap.exists || deptSnap.data()!.status !== "active") return null;
      const departmentName = deptSnap.data()!.name as string;

      // Sum every doctor's approved-slot online capacity per (date, session).
      const perSlot = new Map<string, number>();
      for (const doctorDoc of doctorsSnap.docs) {
        for (const date of dates) {
          for (const session of ["morning", "afternoon"] as const) {
            const slotSnap = await db
              .doc(`${doctorCollection(hospitalId, branchId, doctorDoc.id, "slots")}/${date}_${session}`)
              .get();
            if (!slotSnap.exists) continue;
            const slot = slotSnap.data() as DoctorSlot;
            if (slot.status !== "approved") continue;
            const remaining = Math.max(0, slot.totalCount - slot.walkInReserved - slot.onlineBookedCount);
            if (remaining <= 0) continue;
            const key = `${date}_${session}`;
            perSlot.set(key, (perSlot.get(key) ?? 0) + remaining);
          }
        }
      }

      const slots = Array.from(perSlot.entries()).map(([key, availableCount]) => {
        const [date, session] = key.split("_") as [string, "morning" | "afternoon"];
        return { date, session, availableCount };
      });

      return {
        hospitalId,
        branchId,
        departmentId,
        departmentName,
        isGeneral: departmentName.trim().toLowerCase() === GENERAL_DEPARTMENT_NAME,
        slots,
      };
    }),
  );

  return ListBookableDepartmentsResponse.parse({
    departments: departments.filter((d): d is NonNullable<typeof d> => d !== null),
  });
});
