import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import { hospitalCollection, branchCollection, type Department } from "@hms/shared";

export type DepartmentRecord = Department & { id: string };

export async function listDepartments(hospitalId: string): Promise<DepartmentRecord[]> {
  const snap = await getAdminDb()
    .collection(hospitalCollection(hospitalId, "departments"))
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Department) }));
}

const GENERAL_DEPARTMENT_NAME = "general medicine";

export type PublicDepartment = DepartmentRecord & { isGeneral: boolean };

/**
 * Patient-facing: only departments Office has explicitly released to public
 * booking at this branch (departmentReleases.publiclyBookable — see
 * setDepartmentPublicRelease), sorted with "General Medicine" first since
 * that's the default choice; every other released department is offered as
 * an optional specialization.
 */
/** Office's own view: every active department at this branch, with whether it's currently released. */
export async function listDepartmentReleaseStatuses(
  hospitalId: string,
  branchId: string,
): Promise<(DepartmentRecord & { publiclyBookable: boolean })[]> {
  const [departments, releasesSnap] = await Promise.all([
    listDepartments(hospitalId),
    getAdminDb()
      .collection(branchCollection(hospitalId, branchId, "departmentReleases"))
      .get(),
  ]);
  const releaseState = new Map(releasesSnap.docs.map((d) => [d.id, d.data().publiclyBookable as boolean]));
  return departments
    .filter((d) => d.status === "active")
    .map((d) => ({ ...d, publiclyBookable: releaseState.get(d.id) ?? false }));
}

export async function listPublicDepartments(hospitalId: string, branchId: string): Promise<PublicDepartment[]> {
  const [departments, releasesSnap] = await Promise.all([
    listDepartments(hospitalId),
    getAdminDb()
      .collection(branchCollection(hospitalId, branchId, "departmentReleases"))
      .where("publiclyBookable", "==", true)
      .get(),
  ]);
  const releasedIds = new Set(releasesSnap.docs.map((d) => d.id));
  return departments
    .filter((d) => d.status === "active" && releasedIds.has(d.id))
    .map((d) => ({ ...d, isGeneral: d.name.trim().toLowerCase() === GENERAL_DEPARTMENT_NAME }))
    .sort((a, b) => (a.isGeneral === b.isGeneral ? 0 : a.isGeneral ? -1 : 1));
}
