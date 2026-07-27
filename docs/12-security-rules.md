# 12 — Firestore Security Rules Design

The rules file (`firestore.rules`, created during scaffold) is generated from the
same permission matrix as [08-permission-matrix.md](./08-permission-matrix.md) —
this document explains the rule *design*; the file itself is the enforceable
artifact.

## 12.1 Principles

1. **The client is never trusted.** Every permission in doc 08 is re-checked here,
   independent of `apps/web` route guards or `functions` authorization checks
   (NFR-1.3, three-layer enforcement).
2. **Scope helpers are shared, not duplicated per collection.** Four helper
   functions implement the four scope models from
   [07-user-roles.md](./07-user-roles.md) §7.1, and every collection's rule block
   calls one of them.
3. **No collection allows `list`/`get` without an equality filter the requester is
   authorized for** — rules reject unscoped/unbounded reads even if the requester's
   role would otherwise permit reading that collection, to force NFR-3.2 (query-level
   scoping) at the client.
4. **Status transitions are validated in rules where they're security-relevant**
   (e.g., only `doctor`/`admin` may write `doctorSlots.status == "approved"`), not
   just left to the service layer, since Cloud Functions using the Admin SDK bypass
   rules entirely — rules are the backstop for direct client writes.

> **Revision note:** with the nested hierarchy adopted in
> [09-firestore-design.md](./09-firestore-design.md) §9.1, tenant scope is enforced by
> **path segments** (`hospitalId`/`branchId` bound in the `match` block), not by
> comparing a claim against a `resource.data` field — see the rewritten helpers below.
> `firestore.rules` still implements the earlier flat-field version and needs a
> corresponding rewrite; not yet done as part of this documentation pass — see
> [10-collections-schema.md](./10-collections-schema.md) Migration Status.

## 12.2 Core helper functions (pseudocode)

```
function isSignedIn() {
  return request.auth != null;
}

function claim(key) {
  return request.auth.token[key];
}

function hasRole(roles) {
  return isSignedIn() && claim('role') in roles;
}

// Platform scope — super_admin only, no hospital match required
function isSuperAdmin() {
  return hasRole(['super_admin']);
}

// Hospital scope — role's hospitalId claim must match the path segment (not a data field)
function isHospitalScoped(hospitalId) {
  return isSignedIn() && claim('hospitalId') == hospitalId;
}

// Branch scope — hospitalId AND branchId claims must match the path segments
function isBranchScoped(hospitalId, branchId) {
  return isHospitalScoped(hospitalId) && claim('branchId') == branchId;
}

// Ownership scope — patient's own uid must match the resource's patientId (cross-hospital;
// patients/appointments-by-patientId are the collections this applies to)
function isOwner(resource) {
  return isSignedIn() && claim('role') == 'patient' && resource.data.patientId == request.auth.uid;
}
```

## 12.3 Example collection rule (appointments)

```
match /hospitals/{hospitalId}/branches/{branchId}/appointments/{appointmentId} {
  allow read: if isSuperAdmin()
    || isHospitalScoped(hospitalId)                             // admin
    || isBranchScoped(hospitalId, branchId)                     // office/reception/nurse/doctor, own branch
    || isOwner(resource);                                       // patient, own record (via collectionGroup query)

  allow create: if (hasRole(['patient']) && request.resource.data.patientId == request.auth.uid)
    || (hasRole(['reception']) && isBranchScoped(hospitalId, branchId));

  allow update: if (hasRole(['office']) && isBranchScoped(hospitalId, branchId))       // approve/reject/reschedule
    || (hasRole(['nurse']) && isBranchScoped(hospitalId, branchId) && onlyVitalsFieldsChanged())
    || (hasRole(['doctor']) && isBranchScoped(hospitalId, branchId) && onlyClinicalFieldsChanged())
    || (hasRole(['reception']) && isBranchScoped(hospitalId, branchId) && onlyCheckInFieldsChanged());

  allow delete: if false;   // no hard deletes anywhere
}
```

Every other collection follows this same shape: `read` unions the roles/scopes from
doc 08's row for that collection; `create`/`update` are split out per-role where
different roles are allowed to touch different fields (enforced via a
`onlyFieldsChanged(['a','b'])` helper, not by giving blanket update access); `delete`
is `false` everywhere except truly disposable draft data (none currently identified).
`patients` and `users` keep their flat top-level rule shape (path has no
`hospitalId`/`branchId` segments to bind, per §9.1.2), unchanged from the original
flat-collection design.

## 12.4 Tenant isolation test

Every collection's rules are covered by an emulator test asserting: a user with
`hospitalId: A` cannot read or write a document with `hospitalId: B`, regardless of
role — this is the single most important test in the suite and is written before any
collection's feature work is considered done (see verification approach in the
architecture plan).

## 12.5 Storage rules

`storage.rules` mirrors the same helper functions, applied to path prefixes:

```
/labReports/{hospitalId}/{patientId}/{fileName}   — read: isOwner or same-hospital staff with lab/doctor role; write: lab role only
/certificates/{hospitalId}/{patientId}/{fileName} — read: isOwner or same-hospital staff; write: doctor role only
/profilePhotos/{uid}/{fileName}                   — read: any authenticated user; write: owner only
/insuranceDocs/{patientId}/{fileName}              — read: isOwner or same-hospital admin/reception; write: owner or reception
```

All uploads are additionally validated for `contentType` and `size < 10MB` at the
rules layer (NFR-1.5).
