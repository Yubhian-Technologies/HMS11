/**
 * Firestore path builders for the nested hierarchy (docs/09-firestore-design.md §9.1,
 * docs/10-collections-schema.md §10.2). Pure string builders — no firebase-admin/
 * firebase dependency — usable from `functions` (Admin SDK), `apps/web` server code
 * (Admin SDK), and client code (client SDK), since all three SDKs' `.collection()`
 * accept an arbitrary slash-delimited path string.
 *
 * `users` (the staff directory, including doctors — no separate nested `staff`
 * collection is introduced, see CLAUDE.md changelog), `patients`, `notifications`,
 * and `auditLogs` are flat/global and never go through these helpers
 * (docs/09-firestore-design.md §9.1.2).
 *
 * `wards`, `rooms`, `beds` are three sibling branch-level collections (not
 * physically nested inside each other, unlike doc 10's tree diagram) — beds/rooms
 * are looked up by their own id alone throughout the callables (e.g.
 * `assignBedToAdmission` receives a bare `bedId`) and each already carries a
 * `roomId`/`wardId` reference field; full physical nesting would force every bed
 * lookup to also thread ward/room ancestry for no isolation benefit beyond what
 * branch-nesting already provides. Use `branchCollection(hospitalId, branchId,
 * "wards" | "rooms" | "beds" | ...)` directly for these and every other
 * branch-operational collection.
 */

export function hospitalPath(hospitalId: string): string {
  return `hospitals/${hospitalId}`;
}

/** Hospital-scoped collections that are NOT branch-scoped — currently only `departments`. */
export function hospitalCollection(hospitalId: string, collection: string): string {
  return `${hospitalPath(hospitalId)}/${collection}`;
}

export function branchPath(hospitalId: string, branchId: string): string {
  return `${hospitalPath(hospitalId)}/branches/${branchId}`;
}

/** Branch-operational collections: wards, appointments, invoices, etc. */
export function branchCollection(hospitalId: string, branchId: string, collection: string): string {
  return `${branchPath(hospitalId, branchId)}/${collection}`;
}

/**
 * The doctor extension document — `.../branches/{branchId}/doctors/{uid}`, same
 * id as the corresponding flat `users/{uid}` document (1:1). Renamed from the
 * earlier flat `doctorProfiles` collection.
 */
export function doctorPath(hospitalId: string, branchId: string, uid: string): string {
  return `${branchCollection(hospitalId, branchId, "doctors")}/${uid}`;
}

/** `slots`, nested under one doctor. */
export function doctorCollection(
  hospitalId: string,
  branchId: string,
  uid: string,
  collection: string,
): string {
  return `${doctorPath(hospitalId, branchId, uid)}/${collection}`;
}
